package domain

import (
	"net/url"
	"strings"
	"unicode"
)

var knownSites = map[string]string{
	"github.com":        "GitHub",
	"gitee.com":         "Gitee 码云",
	"gitlab.com":        "GitLab",
	"bilibili.com":      "哔哩哔哩 (B站)",
	"youtube.com":       "YouTube",
	"zhihu.com":         "知乎",
	"juejin.cn":         "稀土掘金",
	"csdn.net":          "CSDN",
	"cnblogs.com":       "博客园",
	"v2ex.com":          "V2EX",
	"segmentfault.com":  "SegmentFault 思否",
	"stackoverflow.com": "Stack Overflow",
	"mozilla.org":       "MDN Web Docs",
	"w3school.com.cn":   "W3School",
	"runoob.com":        "菜鸟教程",
	"leetcode.cn":       "LeetCode 力扣",
	"leetcode.com":      "LeetCode",
	"weibo.com":         "微博",
	"163.com":           "网易",
	"qq.com":            "腾讯",
	"baidu.com":         "百度",
	"douyin.com":        "抖音",
	"sspai.com":         "少数派",
	"36kr.com":          "36氪",
	"jianshu.com":       "简书",
	"infoq.cn":          "InfoQ",
	"figma.com":         "Figma",
	"dribbble.com":      "Dribbble",
	"openai.com":        "OpenAI",
	"deepseek.com":      "DeepSeek",
	"chatgpt.com":       "ChatGPT",
	"mockjs.com":        "Mock.js",
	"wproxy.org":        "Whistle",
	"ruanyifeng.com":    "阮一峰博客",
	"visioneschool.com": "VisioneSchool",
	"talkingdata.com":   "TalkingData",
	"rutracker.org":     "RuTracker",
	"fontello.com":      "Fontello",
	"bitbug.net":        "Bitbug",
	"fly63.com":         "Fly63",
}

// ExtractRootDomain extracts the canonical root domain (eTLD+1) from a raw URL.
func ExtractRootDomain(rawURL string) string {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return ""
	}
	if !strings.HasPrefix(rawURL, "http://") && !strings.HasPrefix(rawURL, "https://") {
		rawURL = "https://" + rawURL
	}

	u, err := url.Parse(rawURL)
	if err != nil {
		return ""
	}

	host := strings.ToLower(u.Host)
	// Strip port
	if colonIdx := strings.Index(host, ":"); colonIdx != -1 {
		host = host[:colonIdx]
	}

	// Handle IP address or single part (e.g. localhost)
	parts := strings.Split(host, ".")
	if len(parts) <= 2 {
		return host
	}

	// Two-part TLD suffixes like .com.cn, .net.cn, .co.uk, etc.
	secondLast := parts[len(parts)-2]
	last := parts[len(parts)-1]
	twoPartTLDs := map[string]bool{
		"com.cn": true, "net.cn": true, "org.cn": true, "gov.cn": true, "edu.cn": true,
		"co.uk": true, "org.uk": true, "co.jp": true, "com.hk": true, "ax-z.cn": true,
	}

	combinedSuffix := secondLast + "." + last
	if twoPartTLDs[combinedSuffix] && len(parts) >= 3 {
		return parts[len(parts)-3] + "." + combinedSuffix
	}

	return secondLast + "." + last
}

// ResolveSiteName returns the primary root domain and a human-friendly secondary classification title.
func ResolveSiteName(rawURL string) (rootDomain string, siteName string) {
	rootDomain = ExtractRootDomain(rawURL)
	if rootDomain == "" {
		return "其他", "其他站点"
	}

	// Check dictionary
	if name, ok := knownSites[rootDomain]; ok {
		// If it's a specific system like jira.visioneschool.com, provide context
		lowerURL := strings.ToLower(rawURL)
		if strings.Contains(lowerURL, "jira.") {
			return rootDomain, "Jira 项目 (" + name + ")"
		}
		if strings.Contains(lowerURL, "mail.163.com") {
			return rootDomain, "网易邮箱"
		}
		return rootDomain, name
	}

	// Derive from domain: capitalize main label
	parts := strings.Split(rootDomain, ".")
	if len(parts) > 0 {
		label := parts[0]
		// Capitalize first character
		if len(label) > 0 {
			runes := []rune(label)
			runes[0] = unicode.ToUpper(runes[0])
			siteName = string(runes) + " (" + rootDomain + ")"
			return rootDomain, siteName
		}
	}

	return rootDomain, rootDomain
}
