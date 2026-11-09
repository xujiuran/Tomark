package ai

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"tomark/pkg/models"
)

var httpClient = &http.Client{
	Timeout: 45 * time.Second,
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatCompletionRequest struct {
	Model          string                 `json:"model"`
	Messages       []ChatMessage          `json:"messages"`
	ResponseFormat map[string]interface{} `json:"response_format,omitempty"`
	Temperature    float64                `json:"temperature"`
}

type ChatCompletionResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// AnalyzeContent sends the article title, url and text to an OpenAI-compatible endpoint.
func AnalyzeContent(title, targetURL, content, apiKey, baseURL, model string) (*models.AISummaryResult, error) {
	if baseURL == "" {
		baseURL = "http://127.0.0.1:3425/v1"
	}
	baseURL = strings.TrimRight(baseURL, "/")
	if model == "" {
		model = "auto/deepseek-v4.1-flash"
	}

	isLocal := strings.Contains(baseURL, "127.0.0.1") || strings.Contains(baseURL, "localhost")
	if !isLocal && apiKey == "" {
		return nil, errors.New("API key is not configured")
	}
	if isLocal && apiKey == "" {
		apiKey = "magpie"
	}

	// Truncate long content to avoid exceeding context window
	trimmedContent := content
	if len(trimmedContent) > 12000 {
		trimmedContent = trimmedContent[:12000] + "... (truncated)"
	}

	systemPrompt := `你是一个专业的个人知识库与书签分类专家。请根据网页信息进行精准归类、提炼摘要与提取标签。

【分类标准体系规范（category 必须严格从以下 10 个标准大类中选择最匹配的 1 项，杜绝随意自造分类）】：
1. "代码与开源平台"：GitHub, Gitee, GitLab, 代码仓库, 开源社区, 算法刷题平台(LeetCode等)。
2. "视频与流媒体"：B站(Bilibili), YouTube, 抖音, 视频播客, 影视流媒体平台。
3. "技术文档与教程"：MDN, 官方开发文档手册, w3cschool, 语言规范, API参考, 权威速查表(CheatSheet)。
4. "技术博客与社区"：掘金, CSDN, 博客园, 开发者问答(StackOverflow/SegmentFault), V2EX, 个人技术博客。
5. "AI 与前沿技术"：ChatGPT, DeepSeek, Claude, 大模型工具, 提示词工程, 机器学习。
6. "设计与视觉灵感"：Figma, Dribbble, 配色工具, 图标库, UI组件库, 设计素材。
7. "效率与开发工具"：邮箱服务(网易/Gmail), 在线格式转换, 云盘, 协作工具, 浏览器插件, 调试运维工具。
8. "资讯与社交媒体"：综合知乎, 微博, Twitter/X, Reddit, 少数派, 36氪, 门户新闻。
9. "生活与日常休闲"：电商购物, 音乐, 游戏, 美食旅行, 生活经验。
10. "商业与职场金融"：招聘求职, 职场发展, 投资理财, 商业分析。

【输出 JSON 规范】：
{
  "category": "上述10个标准分类之一",
  "summary": "1-2句精炼的中文核心介绍（若是平台主页/产品首页，明确其定位与服务；若是具体文章，提炼主旨与核心论点。严禁把'请登录'、'Cookie提示'或'扫码下载'当成正文摘要）",
  "key_takeaways": ["3条最具实质价值的要点"],
  "suggested_tags": ["3-5个具体的业务/技术领域细分标签，如 git, 弹幕视频, 前端, 电子邮箱 等，杜绝 '网站'、'网页'、'首页' 等空洞词汇"]
}`

	userPrompt := fmt.Sprintf("Title: %s\nURL: %s\n\nContent:\n%s", title, targetURL, trimmedContent)

	reqPayload := ChatCompletionRequest{
		Model: model,
		Messages: []ChatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		ResponseFormat: map[string]interface{}{"type": "json_object"},
		Temperature:    0.3,
	}

	jsonBytes, err := json.Marshal(reqPayload)
	if err != nil {
		return nil, err
	}

	endpoint := fmt.Sprintf("%s/chat/completions", baseURL)
	httpReq, err := http.NewRequest("POST", endpoint, bytes.NewReader(jsonBytes))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))

	resp, err := httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("AI request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// Smart fallback for local Magpie proxy: if specific model is not found, auto-fallback to auto/deepseek-v4.1-flash
	if isLocal && resp.StatusCode != http.StatusOK && model != "auto/deepseek-v4.1-flash" {
		bodyStr := string(respBody)
		if strings.Contains(bodyStr, "model_not_found") || strings.Contains(bodyStr, "unknown provider") || strings.Contains(bodyStr, "permission_error") {
			return AnalyzeContent(title, targetURL, content, apiKey, baseURL, "auto/deepseek-v4.1-flash")
		}
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("AI API error (HTTP %d): %s", resp.StatusCode, string(respBody))
	}

	var chatResp ChatCompletionResponse
	if err := json.Unmarshal(respBody, &chatResp); err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	if chatResp.Error != nil && chatResp.Error.Message != "" {
		return nil, errors.New(chatResp.Error.Message)
	}

	if len(chatResp.Choices) == 0 {
		return nil, errors.New("empty response from AI model")
	}

	rawContent := strings.TrimSpace(chatResp.Choices[0].Message.Content)
	// Strip markdown json fences if any
	rawContent = strings.TrimPrefix(rawContent, "```json")
	rawContent = strings.TrimPrefix(rawContent, "```")
	rawContent = strings.TrimSuffix(rawContent, "```")
	rawContent = strings.TrimSpace(rawContent)

	var result models.AISummaryResult
	if err := json.Unmarshal([]byte(rawContent), &result); err != nil {
		return nil, fmt.Errorf("failed to parse AI structured output: %w (raw: %s)", err, rawContent)
	}

	return &result, nil
}
