package scraper

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	readability "github.com/go-shiori/go-readability"
	"golang.org/x/net/html"

	"linkit/pkg/models"
)

var defaultClient = &http.Client{
	Timeout: 15 * time.Second,
}

// FetchPage retrieves metadata and main article text from the given URL.
func FetchPage(rawURL string) (*models.PageMetadata, error) {
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	req, err := http.NewRequest("GET", rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := defaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch URL: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	meta := &models.PageMetadata{
		URL:        rawURL,
		FaviconURL: fmt.Sprintf("%s://%s/favicon.ico", parsedURL.Scheme, parsedURL.Host),
	}

	// 1. Try Readability parser first
	article, readErr := readability.FromReader(bytes.NewReader(bodyBytes), parsedURL)
	if readErr == nil && article.Title != "" {
		meta.Title = strings.TrimSpace(article.Title)
		meta.Excerpt = strings.TrimSpace(article.Excerpt)
		meta.ContentText = strings.TrimSpace(article.TextContent)
		if article.Favicon != "" {
			meta.FaviconURL = resolveURL(parsedURL, article.Favicon)
		}
		if article.Image != "" {
			meta.CoverImage = resolveURL(parsedURL, article.Image)
		}
	}

	// 2. Parse HTML tags for fallback and extra metadata (OG tags, description)
	doc, err := html.Parse(bytes.NewReader(bodyBytes))
	if err == nil {
		extractMetaFromHTML(doc, parsedURL, meta)
	}

	if meta.Title == "" {
		meta.Title = parsedURL.Host
	}

	return meta, nil
}

func extractMetaFromHTML(n *html.Node, base *url.URL, meta *models.PageMetadata) {
	if n.Type == html.ElementNode {
		switch strings.ToLower(n.Data) {
		case "title":
			if meta.Title == "" && n.FirstChild != nil {
				meta.Title = strings.TrimSpace(n.FirstChild.Data)
			}
		case "meta":
			var name, prop, content string
			for _, a := range n.Attr {
				switch strings.ToLower(a.Key) {
				case "name":
					name = strings.ToLower(a.Val)
				case "property":
					prop = strings.ToLower(a.Val)
				case "content":
					content = a.Val
				}
			}
			if (prop == "og:title" || name == "twitter:title") && meta.Title == "" {
				meta.Title = content
			}
			if (prop == "og:description" || name == "description" || name == "twitter:description") && meta.Description == "" {
				meta.Description = content
			}
			if (prop == "og:image" || name == "twitter:image") && meta.CoverImage == "" {
				meta.CoverImage = resolveURL(base, content)
			}
		case "link":
			var rel, href string
			for _, a := range n.Attr {
				switch strings.ToLower(a.Key) {
				case "rel":
					rel = strings.ToLower(a.Val)
				case "href":
					href = a.Val
				}
			}
			if strings.Contains(rel, "icon") && href != "" {
				meta.FaviconURL = resolveURL(base, href)
			}
		}
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		extractMetaFromHTML(c, base, meta)
	}
}

func resolveURL(base *url.URL, target string) string {
	if target == "" {
		return ""
	}
	u, err := url.Parse(target)
	if err != nil {
		return target
	}
	return base.ResolveReference(u).String()
}
