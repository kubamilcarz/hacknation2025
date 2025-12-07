import os
import openai
from typing import List, Dict, Optional
from dotenv import load_dotenv as loadenv
from openai import OpenAI

loadenv()


class ChatGPTClient:
    def __init__(self, api_key: Optional[str] = None):
        self.client = OpenAI()

    def chat_completion(
            self,
            messages: List[Dict[str, str]],
            model: str = "gpt-5.1"
    ) -> str:
        """
        Send a chat completion request to OpenAI API.

        Args:
            messages: List of message dictionaries with 'role' and 'content'
            model: OpenAI model to use

        Returns:
            Generated response text
        """
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
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

    def find_desc_from_pdf(self, text: str):
        prompt = f"""
        Masz podany tekst ze strony formularza PDF. Tekst został odczytany poprzez ocr, zawiera nazwy rubryk, a następnie odpowiedzi na pytania.
        Znajdź tekst, który znajduje się w rubryce opisanej jako "Szczegółowy opis okoliczności, miejsca i przyczyn wypadku". Jako odpowiedź podaj tylko ten tekst. 
        Jeśli nie jesteś w stanie znaleźć takiego tekstu, ponieważ jest na przykład nieczytelny, zwróć pustą odpowiedź. 
        
        Oto tekst ze strony:
        {text}
        """
        return self.simple_chat(prompt)
