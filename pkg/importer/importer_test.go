package importer

import (
	"os"
	"testing"
)

func TestParseHTMLBookmarks(t *testing.T) {
	path := "/Users/tomatoxcj/Documents/bookmarks_2026_11_6.html"
	if _, err := os.Stat(path); err != nil {
		t.Skip("File not found")
	}

	bookmarks, err := ParseBookmarkFile(path)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}

	t.Logf("Successfully parsed %d bookmarks", len(bookmarks))
	if len(bookmarks) > 0 {
		t.Logf("First bookmark: Title='%s', URL='%s', Tags=%v", bookmarks[0].Bookmark.Title, bookmarks[0].Bookmark.URL, bookmarks[0].Folders)
	}
}
