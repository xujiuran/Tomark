package importer

import (
	"encoding/json"
	"fmt"
	"html"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"tomark/pkg/models"
)

// ArcItemData represents the data payload of an Arc item.
type ArcItemData struct {
	Tab *struct {
		SavedTitle string `json:"savedTitle"`
		SavedURL   string `json:"savedURL"`
		URL        string `json:"url"`
	} `json:"tab,omitempty"`
}

// ArcItem represents an item (tab, folder, list) inside Arc StorableSidebar.json.
type ArcItem struct {
	ID          string          `json:"id"`
	Title       string          `json:"title"`
	ParentID    string          `json:"parentID"`
	ChildrenIDs []string        `json:"childrenIds"`
	Data        ArcItemData     `json:"data"`
	CreatedAt   float64         `json:"createdAt"`
}

// GetDefaultArcSidebarPath returns the default path for Arc's StorableSidebar.json (macOS & Windows).
func GetDefaultArcSidebarPath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	// macOS default path
	macPath := filepath.Join(home, "Library", "Application Support", "Arc", "StorableSidebar.json")
	if info, err := os.Stat(macPath); err == nil && !info.IsDir() {
		return macPath
	}
	// Windows default path (Arc for Windows)
	localAppData := os.Getenv("LOCALAPPDATA")
	if localAppData != "" {
		matches, _ := filepath.Glob(filepath.Join(localAppData, "Packages", "*TheBrowserCompany.Arc*", "LocalCache", "Local", "Arc", "StorableSidebar.json"))
		if len(matches) > 0 {
			return matches[0]
		}
	}
	return macPath
}

// HasArcBrowser checks whether Arc browser data is present on this Mac.
func HasArcBrowser() bool {
	p := GetDefaultArcSidebarPath()
	if p == "" {
		return false
	}
	info, err := os.Stat(p)
	return err == nil && !info.IsDir()
}

// ParseArcSidebar extracts all unique bookmarks and folder hierarchies from Arc.
func ParseArcSidebar(filePath string) ([]*ParsedBookmark, error) {
	if filePath == "" {
		filePath = GetDefaultArcSidebarPath()
	}
	bytes, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read Arc sidebar: %w", err)
	}

	var root struct {
		Sidebar struct {
			Containers []struct {
				Items  []json.RawMessage `json:"items"`
				Spaces []struct {
					Title string `json:"title"`
					ID    string `json:"id"`
				} `json:"spaces"`
			} `json:"containers"`
		} `json:"sidebar"`
	}

	if err := json.Unmarshal(bytes, &root); err != nil {
		return nil, fmt.Errorf("failed to parse Arc JSON: %w", err)
	}

	containers := root.Sidebar.Containers
	if len(containers) == 0 {
		return nil, fmt.Errorf("no containers found in Arc sidebar")
	}

	// Usually container index 1 holds personal sidebar items & spaces
	targetContainer := containers[0]
	if len(containers) > 1 {
		targetContainer = containers[1]
	}

	itemMap := make(map[string]*ArcItem)
	for _, raw := range targetContainer.Items {
		var it ArcItem
		if err := json.Unmarshal(raw, &it); err == nil && it.ID != "" {
			itemMap[it.ID] = &it
		}
	}

	// Build folder hierarchy lookup
	folderNames := make(map[string]string)
	for id, it := range itemMap {
		if it.Data.Tab == nil && (len(it.ChildrenIDs) > 0 || it.Title != "") {
			name := strings.TrimSpace(it.Title)
			if name == "" {
				name = "未命名文件夹"
			}
			folderNames[id] = name
		}
	}

	// Helper to collect folder path for a parentID
	getFolders := func(parentID string) []string {
		var path []string
		curr := parentID
		visited := make(map[string]bool)
		for curr != "" && !visited[curr] {
			visited[curr] = true
			if name, ok := folderNames[curr]; ok {
				path = append([]string{name}, path...) // prepend
			}
			if parentItem, ok := itemMap[curr]; ok {
				curr = parentItem.ParentID
			} else {
				break
			}
		}
		return path
	}

	var results []*ParsedBookmark
	seenURLs := make(map[string]bool)

	for _, it := range itemMap {
		if it.Data.Tab != nil {
			targetURL := strings.TrimSpace(it.Data.Tab.SavedURL)
			if targetURL == "" {
				targetURL = strings.TrimSpace(it.Data.Tab.URL)
			}
			if targetURL == "" || (!strings.HasPrefix(targetURL, "http://") && !strings.HasPrefix(targetURL, "https://")) {
				continue
			}

			// In-batch URL deduplication
			normURL := normalizeURL(targetURL)
			if seenURLs[normURL] {
				continue
			}
			seenURLs[normURL] = true

			title := strings.TrimSpace(it.Data.Tab.SavedTitle)
			if title == "" {
				title = strings.TrimSpace(it.Title)
			}
			if title == "" {
				title = targetURL
			}

			folders := getFolders(it.ParentID)
			bm := &models.Bookmark{
				ID:         uuid.NewString(),
				URL:        targetURL,
				Title:      title,
				Tags:       folders,
				StatusCode: 200,
				CreatedAt:  time.Now(),
				UpdatedAt:  time.Now(),
			}

			results = append(results, &ParsedBookmark{
				Bookmark: bm,
				Folders:  folders,
			})
		}
	}

	return results, nil
}

// ExportArcToHTML exports Arc bookmarks into a standard Netscape Bookmark HTML file.
func ExportArcToHTML(outputPath string) (int, error) {
	bookmarks, err := ParseArcSidebar("")
	if err != nil {
		return 0, err
	}

	var sb strings.Builder
	sb.WriteString("<!DOCTYPE NETSCAPE-Bookmark-file-1>\n")
	sb.WriteString("<!-- This is an automatically generated file.\n     It will be read and overwritten.\n     DO NOT EDIT! -->\n")
	sb.WriteString("<META HTTP-EQUIV=\"Content-Type\" CONTENT=\"text/html; charset=UTF-8\">\n")
	sb.WriteString("<TITLE>Arc Bookmarks</TITLE>\n")
	sb.WriteString("<H1>Bookmarks</H1>\n")
	sb.WriteString("<DL><p>\n")

	// Group bookmarks by first folder if present
	folderGroups := make(map[string][]*models.Bookmark)
	var rootBookmarks []*models.Bookmark

	for _, pb := range bookmarks {
		if len(pb.Folders) > 0 {
			folderKey := pb.Folders[0]
			folderGroups[folderKey] = append(folderGroups[folderKey], pb.Bookmark)
		} else {
			rootBookmarks = append(rootBookmarks, pb.Bookmark)
		}
	}

	now := time.Now().Unix()
	for folder, bms := range folderGroups {
		sb.WriteString(fmt.Sprintf("    <DT><H3 ADD_DATE=\"%d\">%s</H3>\n", now, html.EscapeString(folder)))
		sb.WriteString("    <DL><p>\n")
		for _, b := range bms {
			sb.WriteString(fmt.Sprintf("        <DT><A HREF=\"%s\" ADD_DATE=\"%d\">%s</A>\n",
				html.EscapeString(b.URL), now, html.EscapeString(b.Title)))
		}
		sb.WriteString("    </DL><p>\n")
	}

	if len(rootBookmarks) > 0 {
		sb.WriteString(fmt.Sprintf("    <DT><H3 ADD_DATE=\"%d\">其他书签</H3>\n", now))
		sb.WriteString("    <DL><p>\n")
		for _, b := range rootBookmarks {
			sb.WriteString(fmt.Sprintf("        <DT><A HREF=\"%s\" ADD_DATE=\"%d\">%s</A>\n",
				html.EscapeString(b.URL), now, html.EscapeString(b.Title)))
		}
		sb.WriteString("    </DL><p>\n")
	}

	sb.WriteString("</DL><p>\n")

	if err := os.WriteFile(outputPath, []byte(sb.String()), 0644); err != nil {
		return 0, fmt.Errorf("failed to write export file: %w", err)
	}

	return len(bookmarks), nil
}

func normalizeURL(u string) string {
	u = strings.TrimSpace(strings.ToLower(u))
	u = strings.TrimRight(u, "/")
	return u
}
