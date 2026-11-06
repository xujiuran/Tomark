package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"

	"linkit/pkg/models"
)

type DB struct {
	conn *sql.DB
	mu   sync.RWMutex
}

var instance *DB

// GetInstance returns or initializes the SQLite database.
func GetInstance() (*DB, error) {
	if instance != nil {
		return instance, nil
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}
	appDir := filepath.Join(homeDir, ".linkit")
	if err := os.MkdirAll(appDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create data directory: %w", err)
	}

	dbPath := filepath.Join(appDir, "library.db")
	conn, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	d := &DB{conn: conn}
	if err := d.migrate(); err != nil {
		return nil, fmt.Errorf("migration failed: %w", err)
	}

	instance = d
	return instance, nil
}

func (d *DB) migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS bookmarks (
		id TEXT PRIMARY KEY,
		url TEXT NOT NULL UNIQUE,
		title TEXT NOT NULL,
		description TEXT,
		category TEXT DEFAULT '',
		favicon_url TEXT,
		cover_image TEXT,
		content_raw TEXT,
		ai_summary TEXT,
		ai_key_points TEXT,
		status_code INTEGER DEFAULT 200,
		is_archived INTEGER DEFAULT 0,
		is_favorite INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS tags (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL UNIQUE,
		color TEXT DEFAULT '#3b82f6'
	);

	CREATE TABLE IF NOT EXISTS bookmark_tags (
		bookmark_id TEXT REFERENCES bookmarks(id) ON DELETE CASCADE,
		tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
		PRIMARY KEY (bookmark_id, tag_id)
	);

	CREATE TABLE IF NOT EXISTS app_settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);
	`
	if _, err := d.conn.Exec(schema); err != nil {
		return err
	}
	// Migrate existing database to add category if it doesn't exist
	_, _ = d.conn.Exec("ALTER TABLE bookmarks ADD COLUMN category TEXT DEFAULT '';")
	return nil
}

// CreateBookmark inserts or updates a bookmark.
func (d *DB) CreateBookmark(b *models.Bookmark, tags []string) (*models.Bookmark, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	if b.ID == "" {
		b.ID = uuid.NewString()
	}
	now := time.Now()
	b.CreatedAt = now
	b.UpdatedAt = now

	keyPointsJSON, _ := json.Marshal(b.AIKeyPoints)

	query := `
	INSERT INTO bookmarks (
		id, url, title, description, category, favicon_url, cover_image,
		content_raw, ai_summary, ai_key_points, status_code,
		is_archived, is_favorite, created_at, updated_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	ON CONFLICT(url) DO UPDATE SET
		title=excluded.title,
		description=excluded.description,
		category=CASE WHEN excluded.category != '' THEN excluded.category ELSE bookmarks.category END,
		favicon_url=excluded.favicon_url,
		cover_image=excluded.cover_image,
		content_raw=excluded.content_raw,
		updated_at=excluded.updated_at
	RETURNING id;
	`
	isArch := 0
	if b.IsArchived {
		isArch = 1
	}
	isFav := 0
	if b.IsFavorite {
		isFav = 1
	}

	err := d.conn.QueryRow(
		query,
		b.ID, b.URL, b.Title, b.Description, b.Category, b.FaviconURL, b.CoverImage,
		b.ContentRaw, b.AISummary, string(keyPointsJSON), b.StatusCode,
		isArch, isFav, b.CreatedAt, b.UpdatedAt,
	).Scan(&b.ID)
	if err != nil {
		return nil, err
	}

	// Associate tags
	for _, tagName := range tags {
		tagName = strings.TrimSpace(strings.ToLower(tagName))
		if tagName == "" {
			continue
		}
		var tagID string
		err := d.conn.QueryRow("SELECT id FROM tags WHERE name = ?", tagName).Scan(&tagID)
		if err == sql.ErrNoRows {
			tagID = uuid.NewString()
			_, _ = d.conn.Exec("INSERT INTO tags (id, name) VALUES (?, ?)", tagID, tagName)
		}
		_, _ = d.conn.Exec("INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)", b.ID, tagID)
	}

	b.Tags = tags
	return b, nil
}

// BatchCreateBookmarks inserts multiple bookmarks in a single transaction.
func (d *DB) BatchCreateBookmarks(items []*models.Bookmark) (*models.ImportResult, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	tx, err := d.conn.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO bookmarks (
			id, url, title, description, category, favicon_url, cover_image,
			content_raw, ai_summary, ai_key_points, status_code,
			is_archived, is_favorite, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(url) DO UPDATE SET
			title=excluded.title,
			category=CASE WHEN excluded.category != '' THEN excluded.category ELSE bookmarks.category END,
			favicon_url=CASE WHEN bookmarks.favicon_url='' THEN excluded.favicon_url ELSE bookmarks.favicon_url END,
			updated_at=CURRENT_TIMESTAMP;
	`)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	tagStmt, err := tx.Prepare("INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)")
	if err != nil {
		return nil, err
	}
	defer tagStmt.Close()

	btStmt, err := tx.Prepare("INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, (SELECT id FROM tags WHERE name = ?))")
	if err != nil {
		return nil, err
	}
	defer btStmt.Close()

	imported := 0
	now := time.Now()
	for _, b := range items {
		if b.ID == "" {
			b.ID = uuid.NewString()
		}
		isArch := 0
		if b.IsArchived {
			isArch = 1
		}
		isFav := 0
		if b.IsFavorite {
			isFav = 1
		}

		keyPointsJSON, _ := json.Marshal(b.AIKeyPoints)
		_, err := stmt.Exec(
			b.ID, b.URL, b.Title, b.Description, b.Category, b.FaviconURL, b.CoverImage,
			b.ContentRaw, b.AISummary, string(keyPointsJSON), b.StatusCode,
			isArch, isFav, now, now,
		)
		if err != nil {
			continue
		}
		imported++

		// Associate tags
		for _, tagName := range b.Tags {
			tagName = strings.TrimSpace(strings.ToLower(tagName))
			if tagName == "" {
				continue
			}
			tagID := uuid.NewString()
			_, _ = tagStmt.Exec(tagID, tagName)
			_, _ = btStmt.Exec(b.ID, tagName)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return &models.ImportResult{
		TotalImported: imported,
		Duplicates:    len(items) - imported,
	}, nil
}

// GetUnanalyzedBookmarks retrieves bookmarks that haven't been summarized or categorized by AI.
func (d *DB) GetUnanalyzedBookmarks(limit int) ([]*models.Bookmark, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	query := `
	SELECT id, url, title, description, category, favicon_url, cover_image,
	       content_raw, ai_summary, ai_key_points, status_code,
	       is_archived, is_favorite, created_at, updated_at
	FROM bookmarks
	WHERE (ai_summary IS NULL OR ai_summary = '' OR category IS NULL OR category = '') AND is_archived = 0
	ORDER BY created_at DESC
	LIMIT ?;
	`
	rows, err := d.conn.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*models.Bookmark
	for rows.Next() {
		var b models.Bookmark
		var kpStr string
		var isArch, isFav int
		if err := rows.Scan(
			&b.ID, &b.URL, &b.Title, &b.Description, &b.Category, &b.FaviconURL, &b.CoverImage,
			&b.ContentRaw, &b.AISummary, &kpStr, &b.StatusCode,
			&isArch, &isFav, &b.CreatedAt, &b.UpdatedAt,
		); err != nil {
			continue
		}
		b.IsArchived = (isArch == 1)
		b.IsFavorite = (isFav == 1)
		list = append(list, &b)
	}
	return list, nil
}

// GetBookmarks fetches bookmarks according to search filters.
func (d *DB) GetBookmarks(search, tagName, category string, favoriteOnly, archivedOnly bool) ([]*models.Bookmark, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var conditions []string
	var args []interface{}

	if search != "" {
		like := "%" + search + "%"
		conditions = append(conditions, "(b.title LIKE ? OR b.description LIKE ? OR b.url LIKE ? OR b.ai_summary LIKE ?)")
		args = append(args, like, like, like, like)
	}

	if category != "" {
		conditions = append(conditions, "b.category = ?")
		args = append(args, category)
	}

	if favoriteOnly {
		conditions = append(conditions, "b.is_favorite = 1")
	}

	if archivedOnly {
		conditions = append(conditions, "b.is_archived = 1")
	} else {
		conditions = append(conditions, "b.is_archived = 0")
	}

	if tagName != "" {
		conditions = append(conditions, "EXISTS (SELECT 1 FROM bookmark_tags bt JOIN tags t ON bt.tag_id = t.id WHERE bt.bookmark_id = b.id AND t.name = ?)")
		args = append(args, strings.ToLower(tagName))
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	query := fmt.Sprintf(`
	SELECT b.id, b.url, b.title, b.description, b.category, b.favicon_url, b.cover_image,
	       b.content_raw, b.ai_summary, b.ai_key_points, b.status_code,
	       b.is_archived, b.is_favorite, b.created_at, b.updated_at
	FROM bookmarks b
	%s
	ORDER BY b.created_at DESC;
	`, whereClause)

	rows, err := d.conn.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*models.Bookmark
	for rows.Next() {
		var b models.Bookmark
		var keyPointsStr string
		var isArch, isFav int

		err := rows.Scan(
			&b.ID, &b.URL, &b.Title, &b.Description, &b.Category, &b.FaviconURL, &b.CoverImage,
			&b.ContentRaw, &b.AISummary, &keyPointsStr, &b.StatusCode,
			&isArch, &isFav, &b.CreatedAt, &b.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		b.IsArchived = (isArch == 1)
		b.IsFavorite = (isFav == 1)
		if keyPointsStr != "" {
			_ = json.Unmarshal([]byte(keyPointsStr), &b.AIKeyPoints)
		}

		// Query tags for this bookmark
		tagRows, err := d.conn.Query(`
			SELECT t.name FROM tags t
			JOIN bookmark_tags bt ON t.id = bt.tag_id
			WHERE bt.bookmark_id = ?
		`, b.ID)
		if err == nil {
			for tagRows.Next() {
				var tn string
				if err := tagRows.Scan(&tn); err == nil {
					b.Tags = append(b.Tags, tn)
				}
			}
			tagRows.Close()
		}

		result = append(result, &b)
	}

	return result, nil
}

// GetBookmarkByID retrieves one bookmark.
func (d *DB) GetBookmarkByID(id string) (*models.Bookmark, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var b models.Bookmark
	var keyPointsStr string
	var isArch, isFav int

	err := d.conn.QueryRow(`
		SELECT id, url, title, description, category, favicon_url, cover_image,
		       content_raw, ai_summary, ai_key_points, status_code,
		       is_archived, is_favorite, created_at, updated_at
		FROM bookmarks WHERE id = ?
	`, id).Scan(
		&b.ID, &b.URL, &b.Title, &b.Description, &b.Category, &b.FaviconURL, &b.CoverImage,
		&b.ContentRaw, &b.AISummary, &keyPointsStr, &b.StatusCode,
		&isArch, &isFav, &b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	b.IsArchived = (isArch == 1)
	b.IsFavorite = (isFav == 1)
	if keyPointsStr != "" {
		_ = json.Unmarshal([]byte(keyPointsStr), &b.AIKeyPoints)
	}

	tagRows, err := d.conn.Query(`
		SELECT t.name FROM tags t
		JOIN bookmark_tags bt ON t.id = bt.tag_id
		WHERE bt.bookmark_id = ?
	`, b.ID)
	if err == nil {
		for tagRows.Next() {
			var tn string
			if err := tagRows.Scan(&tn); err == nil {
				b.Tags = append(b.Tags, tn)
			}
		}
		tagRows.Close()
	}

	return &b, nil
}

// UpdateBookmarkAI updates AI analysis fields.
func (d *DB) UpdateBookmarkAI(id, summary, category string, keyPoints, tags []string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	kpJSON, _ := json.Marshal(keyPoints)
	_, err := d.conn.Exec(`
		UPDATE bookmarks 
		SET ai_summary = ?, category = ?, ai_key_points = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, summary, category, string(kpJSON), id)
	if err != nil {
		return err
	}

	// Update tags
	for _, tagName := range tags {
		tagName = strings.TrimSpace(strings.ToLower(tagName))
		if tagName == "" {
			continue
		}
		var tagID string
		err := d.conn.QueryRow("SELECT id FROM tags WHERE name = ?", tagName).Scan(&tagID)
		if err == sql.ErrNoRows {
			tagID = uuid.NewString()
			_, _ = d.conn.Exec("INSERT INTO tags (id, name) VALUES (?, ?)", tagID, tagName)
		}
		_, _ = d.conn.Exec("INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)", id, tagID)
	}

	return nil
}

// ResetAllAnalysis resets all AI summaries and categories for re-processing.
func (d *DB) ResetAllAnalysis() error {
	d.mu.Lock()
	defer d.mu.Unlock()
	_, err := d.conn.Exec("UPDATE bookmarks SET ai_summary = '', category = '', ai_key_points = '[]'")
	return err
}

// ToggleFavorite toggles favorite status.
func (d *DB) ToggleFavorite(id string) (bool, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	var current int
	err := d.conn.QueryRow("SELECT is_favorite FROM bookmarks WHERE id = ?", id).Scan(&current)
	if err != nil {
		return false, err
	}
	newVal := 1 - current
	_, err = d.conn.Exec("UPDATE bookmarks SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", newVal, id)
	return newVal == 1, err
}

// ToggleArchive toggles archive status.
func (d *DB) ToggleArchive(id string) (bool, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	var current int
	err := d.conn.QueryRow("SELECT is_archived FROM bookmarks WHERE id = ?", id).Scan(&current)
	if err != nil {
		return false, err
	}
	newVal := 1 - current
	_, err = d.conn.Exec("UPDATE bookmarks SET is_archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", newVal, id)
	return newVal == 1, err
}

// DeleteBookmark removes a bookmark.
func (d *DB) DeleteBookmark(id string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.conn.Exec("DELETE FROM bookmarks WHERE id = ?", id)
	return err
}

// GetTags returns all tags with their usage count.
func (d *DB) GetTags() ([]*models.Tag, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	query := `
	SELECT t.id, t.name, t.color, COUNT(bt.bookmark_id) as count
	FROM tags t
	LEFT JOIN bookmark_tags bt ON t.id = bt.tag_id
	GROUP BY t.id
	ORDER BY count DESC;
	`
	rows, err := d.conn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []*models.Tag
	for rows.Next() {
		var t models.Tag
		if err := rows.Scan(&t.ID, &t.Name, &t.Color, &t.Count); err != nil {
			return nil, err
		}
		tags = append(tags, &t)
	}
	return tags, nil
}

// GetCategories returns all categories with their bookmark count.
func (d *DB) GetCategories() ([]*models.CategoryCount, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	query := `
	SELECT category, COUNT(*) as count
	FROM bookmarks
	WHERE category IS NOT NULL AND category != '' AND is_archived = 0
	GROUP BY category
	ORDER BY count DESC;
	`
	rows, err := d.conn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*models.CategoryCount
	for rows.Next() {
		var c models.CategoryCount
		if err := rows.Scan(&c.Name, &c.Count); err == nil {
			list = append(list, &c)
		}
	}
	return list, nil
}

// GetStats returns summary statistics.
func (d *DB) GetStats() (*models.Stats, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var s models.Stats
	_ = d.conn.QueryRow("SELECT COUNT(*) FROM bookmarks WHERE is_archived = 0").Scan(&s.TotalBookmarks)
	_ = d.conn.QueryRow("SELECT COUNT(*) FROM bookmarks WHERE is_favorite = 1 AND is_archived = 0").Scan(&s.Favorites)
	_ = d.conn.QueryRow("SELECT COUNT(*) FROM bookmarks WHERE is_archived = 1").Scan(&s.Archived)
	_ = d.conn.QueryRow("SELECT COUNT(*) FROM tags").Scan(&s.TotalTags)
	return &s, nil
}

// Setting helpers
func (d *DB) GetSetting(key, fallback string) string {
	d.mu.RLock()
	defer d.mu.RUnlock()
	var val string
	err := d.conn.QueryRow("SELECT value FROM app_settings WHERE key = ?", key).Scan(&val)
	if err != nil {
		return fallback
	}
	return val
}

func (d *DB) SetSetting(key, val string) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	_, err := d.conn.Exec("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", key, val)
	return err
}
