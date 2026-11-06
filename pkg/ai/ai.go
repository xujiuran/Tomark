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

	"linkit/pkg/models"
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

// AnalyzeContent sends the article title and text to an OpenAI-compatible endpoint.
func AnalyzeContent(title, content, apiKey, baseURL, model string) (*models.AISummaryResult, error) {
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

	systemPrompt := `You are an expert knowledge curator. Analyze the given web article and output a valid JSON object matching this schema:
{
  "summary": "Concise 1-2 sentence core summary of the article (in the same language as the article)",
  "key_takeaways": ["3-5 clear bullet points highlighting key insights"],
  "suggested_tags": ["3-5 relevant lowercase tags, e.g. ai, frontend, productivity"],
  "category": "Broad subject category name"
}`

	userPrompt := fmt.Sprintf("Title: %s\n\nContent:\n%s", title, trimmedContent)

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
