import os
import openai
from typing import List, Dict, Optional


class ChatGPTClient:
    def __init__(self, api_key: Optional[str] = None):
        """Initialize ChatGPT client with API key."""
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OpenAI API key is required")
        openai.api_key = self.api_key

    def chat_completion(
            self,
            messages: List[Dict[str, str]],
            model: str = "gpt-3.5-turbo",
            temperature: float = 0.7,
            max_tokens: int = 1000
    ) -> str:
        """
        Send a chat completion request to OpenAI API.

        Args:
            messages: List of message dictionaries with 'role' and 'content'
            model: OpenAI model to use
            temperature: Sampling temperature (0.0 to 2.0)
            max_tokens: Maximum tokens in the response

        Returns:
            Generated response text
        """
        try:
            response = openai.ChatCompletion.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"Error in chat completion: {str(e)}")

    def simple_chat(self, prompt: str) -> str:
        """
        Simple chat interface for single message interactions.

        Args:
            prompt: User's input message

        Returns:
            AI's response
        """
        messages = [{"role": "user", "content": prompt}]
        return self.chat_completion(messages)
