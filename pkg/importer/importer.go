package importer

import (
	"bytes"
	"io"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/net/html"

	"linkit/pkg/models"
)

type ParsedBookmark struct {
	Bookmark *models.Bookmark
	Folders  []string
}

// ParseHTMLBookmarks parses Netscape Bookmark HTML files (exported by Chrome, Edge, Firefox, Safari).
func ParseHTMLBookmarks(r io.Reader) ([]*ParsedBookmark, error) {
	doc, err := html.Parse(r)
	if err != nil {
		return nil, err
	}

	var results []*ParsedBookmark
	var folderStack []string

	var traverse func(*html.Node)
	traverse = func(n *html.Node) {
		if n.Type == html.ElementNode {
			switch strings.ToLower(n.Data) {
			case "h3":
				// Folder name
				folderName := extractText(n)
				folderName = strings.TrimSpace(folderName)
				if folderName != "" && folderName != "书签栏" && folderName != "Bookmarks Bar" && folderName != "其他书签" {
					folderStack = append(folderStack, folderName)
				}
			case "dl":
				// Sub-folder container - child traversal will have folder on stack
			case "a":
				// Bookmark link
				var href, icon string
				for _, attr := range n.Attr {
					switch strings.ToLower(attr.Key) {
					case "href":
						href = strings.TrimSpace(attr.Val)
					case "icon":
						icon = strings.TrimSpace(attr.Val)
					}
				}

				if href != "" && (strings.HasPrefix(href, "http://") || strings.HasPrefix(href, "https://")) {
					title := strings.TrimSpace(extractText(n))
					if title == "" {
						title = href
					}

					tags := make([]string, len(folderStack))
					copy(tags, folderStack)

					b := &models.Bookmark{
						ID:         uuid.NewString(),
						URL:        href,
						Title:      title,
						FaviconURL: icon,
						Tags:       tags,
						StatusCode: 200,
						CreatedAt:  time.Now(),
						UpdatedAt:  time.Now(),
					}

					results = append(results, &ParsedBookmark{
						Bookmark: b,
						Folders:  tags,
					})
				}
			}
		}

		for c := n.FirstChild; c != nil; c = c.NextSibling {
			traverse(c)
		}

		// When popping out of a DL, pop the folderStack if we entered one
		if n.Type == html.ElementNode && strings.ToLower(n.Data) == "dl" && len(folderStack) > 0 {
			folderStack = folderStack[:len(folderStack)-1]
		}
	}

	traverse(doc)
	return results, nil
}

// ParseBookmarkFile opens and parses a local HTML bookmark file.
func ParseBookmarkFile(filePath string) ([]*ParsedBookmark, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return ParseHTMLBookmarks(f)
}

func extractText(n *html.Node) string {
	var buf bytes.Buffer
	var extract func(*html.Node)
	extract = func(cur *html.Node) {
		if cur.Type == html.TextNode {
			buf.WriteString(cur.Data)
		}
		for c := cur.FirstChild; c != nil; c = c.NextSibling {
			extract(c)
		}
	}
	extract(n)
	return buf.String()
}
