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

	"tomark/pkg/domain"
	"tomark/pkg/models"
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
	appDir := filepath.Join(homeDir, ".tomark")
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
		sub_category TEXT DEFAULT '',
		domain TEXT DEFAULT '',
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

	CREATE TABLE IF NOT EXISTS domain_categories (
		domain TEXT PRIMARY KEY,
		category TEXT NOT NULL,
		sub_category TEXT NOT NULL,
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
	// Migrate existing database
	_, _ = d.conn.Exec("ALTER TABLE bookmarks ADD COLUMN category TEXT DEFAULT '';")
	_, _ = d.conn.Exec("ALTER TABLE bookmarks ADD COLUMN sub_category TEXT DEFAULT '';")
	_, _ = d.conn.Exec("ALTER TABLE bookmarks ADD COLUMN domain TEXT DEFAULT '';")
	_, _ = d.conn.Exec("ALTER TABLE bookmarks ADD COLUMN user_notes TEXT DEFAULT '';")
	_, _ = d.conn.Exec("ALTER TABLE bookmarks ADD COLUMN highlights TEXT DEFAULT '[]';")
	_, _ = d.conn.Exec("CREATE INDEX IF NOT EXISTS idx_bookmarks_domain ON bookmarks(domain);")
	_, _ = d.conn.Exec("CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category);")

	// Backfill domain & sub_category for any bookmarks missing them
	rows, err := d.conn.Query("SELECT id, url FROM bookmarks WHERE domain = '' OR domain IS NULL")
	if err == nil {
		type bmItem struct{ id, url string }
		var toUpdate []bmItem
		for rows.Next() {
			var it bmItem
			if err := rows.Scan(&it.id, &it.url); err == nil {
				toUpdate = append(toUpdate, it)
			}
		}
		rows.Close()
		for _, it := range toUpdate {
			rootDomain, siteName := domain.ResolveSiteName(it.url)
			_, _ = d.conn.Exec("UPDATE bookmarks SET domain = ?, sub_category = ? WHERE id = ?", rootDomain, siteName, it.id)
		}
	}

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

	if b.Domain == "" || b.SubCategory == "" {
		b.Domain, b.SubCategory = domain.ResolveSiteName(b.URL)
	}

	// Canonical domain category inheritance: if this root domain has already been classified, inherit it immediately!
	if b.Category == "" && b.Domain != "" {
		var existingCat string
		_ = d.conn.QueryRow("SELECT category FROM domain_categories WHERE domain = ?", b.Domain).Scan(&existingCat)
		if existingCat != "" {
			b.Category = existingCat
		}
	}

	if b.Highlights == "" {
		b.Highlights = "[]"
	}

	keyPointsJSON, _ := json.Marshal(b.AIKeyPoints)

	query := `
	INSERT INTO bookmarks (
		id, url, title, description, category, sub_category, domain, favicon_url, cover_image,
		content_raw, user_notes, highlights, ai_summary, ai_key_points, status_code,
		is_archived, is_favorite, created_at, updated_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	ON CONFLICT(url) DO UPDATE SET
		title=excluded.title,
		description=excluded.description,
		category=CASE WHEN excluded.category != '' THEN excluded.category ELSE bookmarks.category END,
		sub_category=CASE WHEN excluded.sub_category != '' THEN excluded.sub_category ELSE bookmarks.sub_category END,
		domain=excluded.domain,
		favicon_url=excluded.favicon_url,
		cover_image=excluded.cover_image,
		content_raw=CASE WHEN excluded.content_raw != '' THEN excluded.content_raw ELSE bookmarks.content_raw END,
		user_notes=CASE WHEN excluded.user_notes != '' THEN excluded.user_notes ELSE bookmarks.user_notes END,
		highlights=CASE WHEN excluded.highlights != '[]' AND excluded.highlights != '' THEN excluded.highlights ELSE bookmarks.highlights END,
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
		b.ID, b.URL, b.Title, b.Description, b.Category, b.SubCategory, b.Domain, b.FaviconURL, b.CoverImage,
		b.ContentRaw, b.UserNotes, b.Highlights, b.AISummary, string(keyPointsJSON), b.StatusCode,
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
			id, url, title, description, category, sub_category, domain, favicon_url, cover_image,
			content_raw, user_notes, highlights, ai_summary, ai_key_points, status_code,
			is_archived, is_favorite, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(url) DO UPDATE SET
			title=excluded.title,
			category=CASE WHEN excluded.category != '' THEN excluded.category ELSE bookmarks.category END,
			sub_category=CASE WHEN excluded.sub_category != '' THEN excluded.sub_category ELSE bookmarks.sub_category END,
			domain=excluded.domain,
			favicon_url=CASE WHEN bookmarks.favicon_url='' THEN excluded.favicon_url ELSE bookmarks.favicon_url END,
			content_raw=CASE WHEN excluded.content_raw != '' THEN excluded.content_raw ELSE bookmarks.content_raw END,
			user_notes=CASE WHEN excluded.user_notes != '' THEN excluded.user_notes ELSE bookmarks.user_notes END,
			highlights=CASE WHEN excluded.highlights != '[]' AND excluded.highlights != '' THEN excluded.highlights ELSE bookmarks.highlights END,
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
	duplicates := 0
	now := time.Now()
	seenBatch := make(map[string]bool)

	for _, b := range items {
		cleanURL := strings.TrimSpace(b.URL)
		if cleanURL == "" {
			continue
		}
		// In-batch deduplication
		normURL := strings.TrimRight(strings.ToLower(cleanURL), "/")
		if seenBatch[normURL] {
			duplicates++
			continue
		}
		seenBatch[normURL] = true

		// Check if URL already exists in database
		var existingID string
		err := tx.QueryRow("SELECT id FROM bookmarks WHERE url = ? OR rtrim(lower(url), '/') = ?", cleanURL, normURL).Scan(&existingID)
		if err == nil && existingID != "" {
			// Already in DB -> Count as duplicate and skip inserting
			duplicates++
			// Merge tags into existing bookmark
			for _, tagName := range b.Tags {
				tagName = strings.TrimSpace(strings.ToLower(tagName))
				if tagName != "" {
					tagID := uuid.NewString()
					_, _ = tagStmt.Exec(tagID, tagName)
					_, _ = btStmt.Exec(existingID, tagName)
				}
			}
			continue
		}

		if b.ID == "" {
			b.ID = uuid.NewString()
		}
		if b.Domain == "" || b.SubCategory == "" {
			b.Domain, b.SubCategory = domain.ResolveSiteName(b.URL)
		}
		if b.Category == "" && b.Domain != "" {
			var existingCat string
			_ = tx.QueryRow("SELECT category FROM domain_categories WHERE domain = ?", b.Domain).Scan(&existingCat)
			if existingCat != "" {
				b.Category = existingCat
			}
		}

		isArch := 0
		if b.IsArchived {
			isArch = 1
		}
		isFav := 0
		if b.IsFavorite {
			isFav = 1
		}

		if b.Highlights == "" {
			b.Highlights = "[]"
		}

		keyPointsJSON, _ := json.Marshal(b.AIKeyPoints)
		_, err = stmt.Exec(
			b.ID, b.URL, b.Title, b.Description, b.Category, b.SubCategory, b.Domain, b.FaviconURL, b.CoverImage,
			b.ContentRaw, b.UserNotes, b.Highlights, b.AISummary, string(keyPointsJSON), b.StatusCode,
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
		Duplicates:    duplicates,
		Message:       fmt.Sprintf("导入完成：成功新增 %d 个新书签，已自动去重并跳过 %d 个重复书签！", imported, duplicates),
	}, nil
}

// GetUnanalyzedBookmarks retrieves bookmarks that haven't been summarized or categorized by AI.
func (d *DB) GetUnanalyzedBookmarks(limit int) ([]*models.Bookmark, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	query := `
	SELECT id, url, title, description, category, sub_category, domain, favicon_url, cover_image,
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
			&b.ID, &b.URL, &b.Title, &b.Description, &b.Category, &b.SubCategory, &b.Domain, &b.FaviconURL, &b.CoverImage,
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
func (d *DB) GetBookmarks(search, tagName, category, domainFilter string, favoriteOnly, archivedOnly bool) ([]*models.Bookmark, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var conditions []string
	var args []interface{}

	if search != "" {
		like := "%" + search + "%"
		conditions = append(conditions, "(b.title LIKE ? OR b.description LIKE ? OR b.url LIKE ? OR b.ai_summary LIKE ? OR b.sub_category LIKE ? OR b.user_notes LIKE ?)")
		args = append(args, like, like, like, like, like, like)
	}

	if category != "" {
		conditions = append(conditions, "b.category = ?")
		args = append(args, category)
	}

	if domainFilter != "" {
		conditions = append(conditions, "(b.domain = ? OR b.sub_category = ?)")
		args = append(args, domainFilter, domainFilter)
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
	SELECT b.id, b.url, b.title, b.description, b.category, b.sub_category, b.domain, b.favicon_url, b.cover_image,
	       b.content_raw, b.user_notes, b.highlights, b.ai_summary, b.ai_key_points, b.status_code,
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
			&b.ID, &b.URL, &b.Title, &b.Description, &b.Category, &b.SubCategory, &b.Domain, &b.FaviconURL, &b.CoverImage,
			&b.ContentRaw, &b.UserNotes, &b.Highlights, &b.AISummary, &keyPointsStr, &b.StatusCode,
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
		SELECT id, url, title, description, category, sub_category, domain, favicon_url, cover_image,
		       content_raw, user_notes, highlights, ai_summary, ai_key_points, status_code,
		       is_archived, is_favorite, created_at, updated_at
		FROM bookmarks WHERE id = ?
	`, id).Scan(
		&b.ID, &b.URL, &b.Title, &b.Description, &b.Category, &b.SubCategory, &b.Domain, &b.FaviconURL, &b.CoverImage,
		&b.ContentRaw, &b.UserNotes, &b.Highlights, &b.AISummary, &keyPointsStr, &b.StatusCode,
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

// GetBookmarksByIDs fetches a list of bookmarks by their IDs.
func (d *DB) GetBookmarksByIDs(ids []string) ([]*models.Bookmark, error) {
	if len(ids) == 0 {
		return []*models.Bookmark{}, nil
	}
	d.mu.RLock()
	defer d.mu.RUnlock()

	placeholders := make([]string, len(ids))
	args := make([]interface{}, len(ids))
	for i, id := range ids {
		placeholders[i] = "?"
		args[i] = id
	}

	query := fmt.Sprintf(`
		SELECT id, url, title, description, category, sub_category, domain, favicon_url, cover_image,
		       content_raw, ai_summary, ai_key_points, status_code,
		       is_archived, is_favorite, created_at, updated_at
		FROM bookmarks
		WHERE id IN (%s)
	`, strings.Join(placeholders, ","))

	rows, err := d.conn.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*models.Bookmark
	for rows.Next() {
		var b models.Bookmark
		var keyPointsStr string
		var isArch, isFav int
		if err := rows.Scan(
			&b.ID, &b.URL, &b.Title, &b.Description, &b.Category, &b.SubCategory, &b.Domain, &b.FaviconURL, &b.CoverImage,
			&b.ContentRaw, &b.AISummary, &keyPointsStr, &b.StatusCode,
			&isArch, &isFav, &b.CreatedAt, &b.UpdatedAt,
		); err != nil {
			continue
		}
		b.IsArchived = (isArch == 1)
		b.IsFavorite = (isFav == 1)
		if keyPointsStr != "" {
			_ = json.Unmarshal([]byte(keyPointsStr), &b.AIKeyPoints)
		}
		list = append(list, &b)
	}

	return list, nil
}

// UpdateBookmarkAI updates AI analysis fields, records canonical domain category, and synchronizes all same-domain bookmarks.
func (d *DB) UpdateBookmarkAI(id, summary, category string, keyPoints, tags []string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	var bmDomain, bmSubCat, bmURL string
	_ = d.conn.QueryRow("SELECT domain, sub_category, url FROM bookmarks WHERE id = ?", id).Scan(&bmDomain, &bmSubCat, &bmURL)
	if bmDomain == "" {
		bmDomain, bmSubCat = domain.ResolveSiteName(bmURL)
	}

	kpJSON, _ := json.Marshal(keyPoints)
	_, err := d.conn.Exec(`
		UPDATE bookmarks 
		SET ai_summary = ?, category = ?, domain = ?, sub_category = ?, ai_key_points = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, summary, category, bmDomain, bmSubCat, string(kpJSON), id)
	if err != nil {
		return err
	}

	// Canonical domain category: once classified, unify all bookmarks with this root domain!
	if bmDomain != "" && category != "" {
		_, _ = d.conn.Exec(`
			INSERT INTO domain_categories (domain, category, sub_category, updated_at)
			VALUES (?, ?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(domain) DO UPDATE SET
				category = excluded.category,
				sub_category = excluded.sub_category,
				updated_at = CURRENT_TIMESTAMP;
		`, bmDomain, category, bmSubCat)

		_, _ = d.conn.Exec(`
			UPDATE bookmarks 
			SET category = ?, sub_category = CASE WHEN sub_category = '' THEN ? ELSE sub_category END
			WHERE domain = ?;
		`, category, bmSubCat, bmDomain)
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

// UpdateBookmarkNotes updates user notes for a bookmark.
func (d *DB) UpdateBookmarkNotes(id, notes string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.conn.Exec(`
		UPDATE bookmarks 
		SET user_notes = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?;
	`, notes, id)
	return err
}

// UpdateBookmarkHighlights updates JSON highlights for a bookmark.
func (d *DB) UpdateBookmarkHighlights(id, highlightsJSON string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.conn.Exec(`
		UPDATE bookmarks 
		SET highlights = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?;
	`, highlightsJSON, id)
	return err
}

// SaveBookmarkContent saves extracted article text.
func (d *DB) SaveBookmarkContent(id, contentRaw string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.conn.Exec(`
		UPDATE bookmarks 
		SET content_raw = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?;
	`, contentRaw, id)
	return err
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

// GetTags returns filtered, meaningful tags with usage counts.
func (d *DB) GetTags() ([]*models.Tag, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	query := `
	SELECT t.id, t.name, t.color, COUNT(bt.bookmark_id) as count
	FROM tags t
	JOIN bookmark_tags bt ON t.id = bt.tag_id
	JOIN bookmarks b ON bt.bookmark_id = b.id
	WHERE b.is_archived = 0
	GROUP BY t.id
	HAVING count > 0
	ORDER BY count DESC
	LIMIT 25;
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

// GetCategoryHierarchy returns two-level categories: 一级大类 -> 二级站点(域名) -> 计数.
func (d *DB) GetCategoryHierarchy() ([]*models.CategoryHierarchy, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	query := `
	SELECT category, domain, sub_category, COUNT(*) as cnt
	FROM bookmarks
	WHERE category IS NOT NULL AND category != '' AND is_archived = 0
	GROUP BY category, domain, sub_category
	ORDER BY category ASC, cnt DESC;
	`
	rows, err := d.conn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	catMap := make(map[string]*models.CategoryHierarchy)
	var catOrder []string

	for rows.Next() {
		var cat, dom, subCat string
		var count int
		if err := rows.Scan(&cat, &dom, &subCat, &count); err != nil {
			continue
		}
		if dom == "" {
			dom = "other"
		}
		if subCat == "" {
			subCat = dom
		}

		hierarchy, exists := catMap[cat]
		if !exists {
			hierarchy = &models.CategoryHierarchy{
				Name:          cat,
				Count:         0,
				SubCategories: []*models.SubCategoryCount{},
			}
			catMap[cat] = hierarchy
			catOrder = append(catOrder, cat)
		}

		hierarchy.Count += count
		hierarchy.SubCategories = append(hierarchy.SubCategories, &models.SubCategoryCount{
			Name:   subCat,
			Domain: dom,
			Count:  count,
		})
	}

	// Also append any empty custom categories from settings
	var customCats []string
	val := ""
	_ = d.conn.QueryRow("SELECT value FROM app_settings WHERE key = 'custom_categories'").Scan(&val)
	if val != "" {
		_ = json.Unmarshal([]byte(val), &customCats)
		for _, cc := range customCats {
			if _, exists := catMap[cc]; !exists {
				catMap[cc] = &models.CategoryHierarchy{
					Name:          cc,
					Count:         0,
					SubCategories: []*models.SubCategoryCount{},
				}
				catOrder = append(catOrder, cc)
			}
		}
	}

	result := make([]*models.CategoryHierarchy, 0, len(catOrder))
	for _, cName := range catOrder {
		result = append(result, catMap[cName])
	}
	return result, nil
}

// RenameCategory updates all bookmarks with the old category name to the new name.
func (d *DB) RenameCategory(oldName, newName string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	oldName = strings.TrimSpace(oldName)
	newName = strings.TrimSpace(newName)
	if oldName == "" || newName == "" {
		return fmt.Errorf("分类名称不能为空")
	}

	_, err := d.conn.Exec("UPDATE bookmarks SET category = ?, updated_at = CURRENT_TIMESTAMP WHERE category = ?", newName, oldName)
	if err != nil {
		return err
	}

	// Update custom_categories in settings if present
	var customCats []string
	val := ""
	_ = d.conn.QueryRow("SELECT value FROM app_settings WHERE key = 'custom_categories'").Scan(&val)
	if val != "" {
		_ = json.Unmarshal([]byte(val), &customCats)
		changed := false
		for i, c := range customCats {
			if c == oldName {
				customCats[i] = newName
				changed = true
			}
		}
		if changed {
			bytes, _ := json.Marshal(customCats)
			_, _ = d.conn.Exec("INSERT INTO app_settings (key, value) VALUES ('custom_categories', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", string(bytes))
		}
	}
	return nil
}

// MergeCategories moves all bookmarks from source category into target category.
func (d *DB) MergeCategories(sourceCat, targetCat string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	sourceCat = strings.TrimSpace(sourceCat)
	targetCat = strings.TrimSpace(targetCat)
	if sourceCat == "" || targetCat == "" {
		return fmt.Errorf("源分类与目标分类不能为空")
	}
	if sourceCat == targetCat {
		return nil
	}

	_, err := d.conn.Exec("UPDATE bookmarks SET category = ?, updated_at = CURRENT_TIMESTAMP WHERE category = ?", targetCat, sourceCat)
	if err != nil {
		return err
	}

	// Remove sourceCat from custom_categories
	var customCats []string
	val := ""
	_ = d.conn.QueryRow("SELECT value FROM app_settings WHERE key = 'custom_categories'").Scan(&val)
	if val != "" {
		_ = json.Unmarshal([]byte(val), &customCats)
		var filtered []string
		for _, c := range customCats {
			if c != sourceCat {
				filtered = append(filtered, c)
			}
		}
		bytes, _ := json.Marshal(filtered)
		_, _ = d.conn.Exec("INSERT INTO app_settings (key, value) VALUES ('custom_categories', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", string(bytes))
	}
	return nil
}

// DeleteCategory deletes or clears the category on all bookmarks.
func (d *DB) DeleteCategory(category string, deleteBookmarks bool) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	category = strings.TrimSpace(category)
	if category == "" {
		return fmt.Errorf("分类名称不能为空")
	}

	if deleteBookmarks {
		_, err := d.conn.Exec("DELETE FROM bookmarks WHERE category = ?", category)
		if err != nil {
			return err
		}
	} else {
		_, err := d.conn.Exec("UPDATE bookmarks SET category = '', updated_at = CURRENT_TIMESTAMP WHERE category = ?", category)
		if err != nil {
			return err
		}
	}

	// Remove from custom_categories
	var customCats []string
	val := ""
	_ = d.conn.QueryRow("SELECT value FROM app_settings WHERE key = 'custom_categories'").Scan(&val)
	if val != "" {
		_ = json.Unmarshal([]byte(val), &customCats)
		var filtered []string
		for _, c := range customCats {
			if c != category {
				filtered = append(filtered, c)
			}
		}
		bytes, _ := json.Marshal(filtered)
		_, _ = d.conn.Exec("INSERT INTO app_settings (key, value) VALUES ('custom_categories', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", string(bytes))
	}
	return nil
}

// MoveSubCategory moves all bookmarks of a domain to a new category.
func (d *DB) MoveSubCategory(domain, targetCategory string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	domain = strings.TrimSpace(domain)
	targetCategory = strings.TrimSpace(targetCategory)
	if domain == "" || targetCategory == "" {
		return fmt.Errorf("域名与目标分类不能为空")
	}

	_, err := d.conn.Exec("UPDATE bookmarks SET category = ?, updated_at = CURRENT_TIMESTAMP WHERE domain = ?", targetCategory, domain)
	return err
}

// RenameSubCategory updates the sub_category display name for bookmarks under a domain.
func (d *DB) RenameSubCategory(domain, newDisplayName string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	domain = strings.TrimSpace(domain)
	newDisplayName = strings.TrimSpace(newDisplayName)
	if domain == "" || newDisplayName == "" {
		return fmt.Errorf("域名与显示名称不能为空")
	}

	_, err := d.conn.Exec("UPDATE bookmarks SET sub_category = ?, updated_at = CURRENT_TIMESTAMP WHERE domain = ?", newDisplayName, domain)
	return err
}

// DeleteSubCategory deletes or clears bookmarks for a specific domain within a category.
func (d *DB) DeleteSubCategory(category, domain string, deleteBookmarks bool) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	domain = strings.TrimSpace(domain)
	category = strings.TrimSpace(category)
	if domain == "" {
		return fmt.Errorf("域名不能为空")
	}

	if deleteBookmarks {
		if category != "" {
			_, err := d.conn.Exec("DELETE FROM bookmarks WHERE domain = ? AND category = ?", domain, category)
			return err
		}
		_, err := d.conn.Exec("DELETE FROM bookmarks WHERE domain = ?", domain)
		return err
	}

	if category != "" {
		_, err := d.conn.Exec("UPDATE bookmarks SET category = '', sub_category = '', updated_at = CURRENT_TIMESTAMP WHERE domain = ? AND category = ?", domain, category)
		return err
	}
	_, err := d.conn.Exec("UPDATE bookmarks SET category = '', sub_category = '', updated_at = CURRENT_TIMESTAMP WHERE domain = ?", domain)
	return err
}

// UpdateBookmarkCategory updates category and sub_category for a single bookmark.
func (d *DB) UpdateBookmarkCategory(bookmarkID, category, subCategory string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	bookmarkID = strings.TrimSpace(bookmarkID)
	category = strings.TrimSpace(category)
	subCategory = strings.TrimSpace(subCategory)

	_, err := d.conn.Exec("UPDATE bookmarks SET category = ?, sub_category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", category, subCategory, bookmarkID)
	return err
}

// UpdateBookmarkTags updates tags for a single bookmark.
func (d *DB) UpdateBookmarkTags(bookmarkID string, tags []string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.conn.Exec("DELETE FROM bookmark_tags WHERE bookmark_id = ?", bookmarkID)
	if err != nil {
		return err
	}

	for _, tName := range tags {
		tName = strings.TrimSpace(tName)
		if tName == "" {
			continue
		}
		var tagID string
		err := d.conn.QueryRow("SELECT id FROM tags WHERE name = ?", tName).Scan(&tagID)
		if err != nil {
			tagID = uuid.New().String()
			_, _ = d.conn.Exec("INSERT INTO tags (id, name) VALUES (?, ?)", tagID, tName)
		}
		_, _ = d.conn.Exec("INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)", bookmarkID, tagID)
	}
	return nil
}

// CreateCategory adds a new custom category.
func (d *DB) CreateCategory(name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return fmt.Errorf("分类名称不能为空")
	}

	d.mu.Lock()
	defer d.mu.Unlock()

	var customCats []string
	val := ""
	_ = d.conn.QueryRow("SELECT value FROM app_settings WHERE key = 'custom_categories'").Scan(&val)
	if val != "" {
		_ = json.Unmarshal([]byte(val), &customCats)
	}

	for _, c := range customCats {
		if c == name {
			return nil
		}
	}
	customCats = append(customCats, name)
	bytes, _ := json.Marshal(customCats)
	_, err := d.conn.Exec("INSERT INTO app_settings (key, value) VALUES ('custom_categories', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", string(bytes))
	return err
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

// BatchUpdateCategory updates category (and optionally sub_category) for multiple bookmarks.
func (d *DB) BatchUpdateCategory(ids []string, category, subCategory string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if len(ids) == 0 {
		return nil
	}
	category = strings.TrimSpace(category)
	subCategory = strings.TrimSpace(subCategory)

	tx, err := d.conn.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare("UPDATE bookmarks SET category = ?, sub_category = CASE WHEN ? != '' THEN ? ELSE sub_category END, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		if _, err := stmt.Exec(category, subCategory, subCategory, id); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// BatchAddTags adds tags to multiple bookmarks without deleting existing ones.
func (d *DB) BatchAddTags(ids []string, newTags []string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if len(ids) == 0 || len(newTags) == 0 {
		return nil
	}

	tx, err := d.conn.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var tagIDs []string
	for _, tName := range newTags {
		tName = strings.TrimSpace(tName)
		if tName == "" {
			continue
		}
		var tagID string
		err := tx.QueryRow("SELECT id FROM tags WHERE name = ?", tName).Scan(&tagID)
		if err != nil {
			tagID = uuid.New().String()
			if _, err := tx.Exec("INSERT INTO tags (id, name) VALUES (?, ?)", tagID, tName); err != nil {
				return err
			}
		}
		tagIDs = append(tagIDs, tagID)
	}

	stmt, err := tx.Prepare("INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)")
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		for _, tagID := range tagIDs {
			if _, err := stmt.Exec(id, tagID); err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}

// BatchRemoveTag removes a specific tag from multiple bookmarks.
func (d *DB) BatchRemoveTag(ids []string, tagName string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if len(ids) == 0 || strings.TrimSpace(tagName) == "" {
		return nil
	}

	var tagID string
	err := d.conn.QueryRow("SELECT id FROM tags WHERE name = ?", strings.TrimSpace(tagName)).Scan(&tagID)
	if err != nil {
		return nil
	}

	tx, err := d.conn.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare("DELETE FROM bookmark_tags WHERE bookmark_id = ? AND tag_id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id != "" {
			if _, err := stmt.Exec(id, tagID); err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}

// BatchToggleArchive updates archived state for multiple bookmarks.
func (d *DB) BatchToggleArchive(ids []string, archive bool) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if len(ids) == 0 {
		return nil
	}
	val := 0
	if archive {
		val = 1
	}

	tx, err := d.conn.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare("UPDATE bookmarks SET is_archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id != "" {
			if _, err := stmt.Exec(val, id); err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}

// BatchToggleFavorite updates favorite state for multiple bookmarks.
func (d *DB) BatchToggleFavorite(ids []string, favorite bool) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if len(ids) == 0 {
		return nil
	}
	val := 0
	if favorite {
		val = 1
	}

	tx, err := d.conn.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare("UPDATE bookmarks SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id != "" {
			if _, err := stmt.Exec(val, id); err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}

// BatchDeleteBookmarks deletes multiple bookmarks and their associated tags.
func (d *DB) BatchDeleteBookmarks(ids []string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if len(ids) == 0 {
		return nil
	}

	tx, err := d.conn.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt1, err := tx.Prepare("DELETE FROM bookmark_tags WHERE bookmark_id = ?")
	if err != nil {
		return err
	}
	defer stmt1.Close()

	stmt2, err := tx.Prepare("DELETE FROM bookmarks WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt2.Close()

	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id != "" {
			if _, err := stmt1.Exec(id); err != nil {
				return err
			}
			if _, err := stmt2.Exec(id); err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}
