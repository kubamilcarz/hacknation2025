from typing import List, Dict, Optional
from dotenv import load_dotenv as loadenv
from openai import OpenAI

from api.serializers import DocumentContextSerializer

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
        Jeśli nie jesteś w stanie znaleźć jakiegoś tekstu, ponieważ jest na przykład nieczytelny, zwróć pustą odpowiedź. 
        Zwróć następujące dane w formacie json:
        ```json
        {
            "czy_poszkodowany_jest_osobą_zgłaszającą": true/false,
            "data_wypadku": "Wartość z pola Data wypadku",
            "godzina_wypadku": "Wartość z pola Godzina wypadku",
            "miejsce_wypadku": "Wartość z pola Miejsce wypadku",
            "planowana_godzina_rozpoczecia_pracy": "Wartość z pola Planowana godzina rozpoczęcia pracy w dniu wypadku",
            "planowana_godzina_zakonczenia_pracy": "Wartość z pola Planowana godzina zakończenia pracy w dniu wypadku",
            "rodzaj_urazow": "Wartość z pola Rodzaj doznanych urazów",
            "szczegoly_okolicznosci": "Wartość z pola Szczegółowy opis okoliczności, miejsca i przyczyn wypadku",
            "czy_udzielona_została_pomoc": "Wartość z pola Czy była udzielona pierwszej pomoc medyczna",
            "miejsce_udzielenia_pomocy": "Wartość z pola Czy była udzielona pierwszej pomoc medyczna",
            "organ_postępowania": "Wartość z pola Organ, który prowadził psotępowanie w sprawie wypadku",
            "czy_wypadku_podczas_uzywania_maszyny": "Wartość bool z pola Czy wypadek powstał podczas obsługi maszyn, urządzeń",
            "opis_maszyny": "Wartość z pola Czy wypadek powstał podczas obsługi maszyn, urządzeń",
            "czy_maszyna_posiada_atest": "Wartość bool z pola Czy maszyna posiada atest",
            "czy_maszyna_w_ewidencji": "Wartość bool z pola Czy maszyna, urządzenie zostało wpisane do ewidencji środków trwałych",
            "liczba_świadków": "Liczba świadków w sprawie (z wypełnionymi danymi)",
            "lista_załączników": []
        }
        ```
        
        
        Oto tekst ze strony:
        {text}
        """
        return self.simple_chat(prompt)

    def user_recommendation(self, data, field_name: str, history: str):
        prompt = f"""
        Twoją rolą jest weryfikacja i doprecyzowanie odpowiedzi użytkownika w pytaniach otwartych. Chodzi o zgłoszenie wypadku przy pracy osoby prowadzącej pozarolniczą działalność gospodarczą.

        Nie wolno Ci sugerować treści odpowiedzi. Nie twórz faktów za użytkownika.

        Twoim celem jest zadawanie pytań pogłębiających. Oceń kompletność dotychczasowego opisu. Twoim zadaniem jest uzyskanie jak największej informacji na temat "Informacji o Wypadku".

        Na podstawie tego, co użytkownik napisze, musisz stworzyć opis odpowiadający na dane pole w formularzu.

        ### Zakres merytoryczny (Co masz ustalać)

        Na podstawie odpowiedzi użytkownika staraj się ustalić, czy opis zawiera:

        * **Okoliczności i przebieg zdarzenia:**
            * Jakie czynności związane z działalnością wykonywał Pan/Pani do momentu wypadku?
            * Jak wyglądała sekwencja zdarzeń krok po kroku?
            * Gdzie dokładnie doszło do wypadku?
            * Jakie były warunki otoczenia (np. śliska podłoga, przeszkody, narzędzia, maszyny)?

        * **Przyczyna zewnętrzna i nagłość zdarzenia:**
            * Czy zdarzenie miało charakter jednorazowy i nagły? (Pamiętaj, nagłość zdarzenia jest kluczowa!)
            * Co konkretnie spowodowało uraz (np. poślizgnięcie, uderzenie, zadziałanie maszyny)?

        * **Uraz i konsekwencje zdrowotne:**
            * Jaki konkretny uraz powstał (np. złamanie, skręcenie, stłuczenie, rana)?
            * Czy udzielono pierwszej pomocy? Czy była hospitalizacja lub zwolnienie lekarskie?

        * **Związek z prowadzoną działalnością:**
            * Jaka dokładnie czynność zawodowa była wykonywana?
            * Dlaczego ta czynność była związana z działalnością gospodarczą (np. realizacja usługi, montaż, naprawa)?

        * **Czas, świadkowie, BHP, urządzenia:**
            * Jaka była data i godzina wypadku? Jaki był planowany czas pracy tego dnia?
            * Czy byli świadkowie? Jeśli tak, podaj imię i nazwisko.
            * Czy używał Pan/Pani środków ochrony indywidualnej (np. rękawice, kask, obuwie)?
            * Jaki był rodzaj urządzeń/maszyn? Czy były sprawne? Czy używał ich Pan/Pani zgodnie z instrukcją?

        ### Styl zadawania pytań (Jak masz pytać)

        Zawsze odwołuj się do tego, co użytkownik już napisał. Pytaj o brakujące szczegóły.

        **Zadawaj pytania typu:**

        * "Co dokładnie robił Pan/Pani tuż przed wypadkiem?"
        * "Jak krok po kroku wyglądało to zdarzenie?"
        * "Gdzie dokładnie to się wydarzyło?"
        * "Jakie obrażenia powstały w wyniku tego zdarzenia?"

        **Nie sugeruj odpowiedzi.** Unikaj pytań typu: "Czy na pewno poślizgnął się Pan/Pani na mokrej podłodze?".

        Możesz korzystać z metody drzewa przyczyn, aby pomóc w sformułowaniu odpowiedzi na pytanie.

        ### Prostota i komunikacja

        Generuj wszystko w **prostym języku**.

        * Używaj zrozumiałych, codziennych słów.
        * Pisz krótkimi zdaniami – jedna myśl to jedno zdanie.
        * Zachowaj naturalny szyk: podmiot + orzeczenie + dopełnienie.
        * Unikaj imiesłowów i trudnych rzeczowników odczasownikowych.
        * Pisz aktywnie i zwracaj się bezpośrednio do odbiorcy.
        * Unikaj trudnych i specjalistycznych słów (jeśli używasz – wyjaśnij).
        * Porządkuj tekst: nagłówki, akapity, wypunktowania.
        * Ograniczaj zbędne szczegóły.
        * Unikaj strony biernej, form bezosobowych i czasu przeszłego.

        **Twoja rola to:** doprecyzować opis i wskazać braki, **nie oceniać prawnie zdarzenia.**
        
        Będziesz pomagał użytkownikowi przy wypełnieniu następujących pól:
        * rodzaj_urazow (opis jakich urazów doznał pracownik)
        * szczegoly_okolicznosci (Szczegółowy opis okoliczności, miejsca i przyczyn wypadku)
        * opis_maszyny (opis maszyny, jeśli wypadek powstał przy obsłudze maszyny)
        
        Aktualne dane znajdujące się w formularzu:
        {DocumentContextSerializer(data).data}
        
        Użytkownik aktualnie edytuje pole: 
        {field_name}
        
        Historia konwersacji:
        {history}
        
        
        Zwróć informację w postaci json:
        
        ```json
            {   
                "wartosc_pola": "Nowa wartość aktualnie edytowanego przez użytkownika pola (jeśli jest gotowe)"
                "wiadomosc": "Wiadomość do użytkownika, która pomoże mu wypełnić pole (jeśli dane nie są pełne)"    
            }
        ```
        """

        return self.simple_chat(prompt)

    def worker_recommendation(self, data):
        prompt = f"""
        Jesteś pracownikiem Zakładu Ubezpieczeń Społecznych (ZUS). Twoją rolą jest krytyczna ocena jakości i kompletności wstępnego wniosku „Zawiadomienie o wypadku”.

        Nie rozstrzygasz prawnie sprawy. Twoim głównym celem jest **ocena jakości wniosku** poprzez wskazanie braków i elementów wymagających doprecyzowania.

        ### Zasady Pracy

        * Sprawdzasz, czy informacje są **konkretne i pełne**.
        * Wskazujesz nieścisłości i miejsca, które wymagają doprecyzowania.
        * Jeśli informacja wygląda na prywatną, **pytasz o związek z prowadzoną działalnością gospodarczą**.
        * Pytania pogłębiające muszą **zawsze odnosić się do treści podanej przez użytkownika**.
        * **Nie proponujesz i nie sugerujesz własnej wersji zdarzeń.**
        * Masz obowiązek wskazać, jeśli któregokolwiek elementu brakuje. Masz zapytać użytkownika o brakujące informacje, ale bez sugerowania odpowiedzi.

        ### Zakres Merytoryczny (Weryfikacja Przesłanek Definicji Wypadku)

        Weryfikujesz, czy opis spełnia cztery podstawowe przesłanki definicji wypadku przy pracy:

        a) **Nagłość zdarzenia:** Zdarzenie musi być **jednorazowe, natychmiastowe**, bez długotrwałych dolegliwości poprzedzających uraz.
        b) **Przyczyna zewnętrzna:** Uraz musi wynikać z działania **czynnika spoza organizmu** (np. maszyna, poślizgnięcie, uderzenie, śliska powierzchnia).
        c) **Uraz:** Musi wystąpić **konkretne uszkodzenie ciała lub narządu** (np. złamanie, rana, stłuczenie). Brak urazu oznacza brak spełnienia definicji.
        d) **Związek z pracą:** Zdarzenie musi mieć związek z **wykonywaniem zwykłych czynności** związanych z prowadzoną działalnością gospodarczą.

        * **Wątpliwości merytoryczne:** Jeśli masz wątpliwości odnośnie któregokolwiek z tych elementów, wskaż, że należy pozyskać **dokumentację** od poszkodowanego (w ramach postępowania wyjaśniającego).
        * **Wątpliwości dotyczące urazu:** Jeśli masz wątpliwości, czy doznany uraz spełnia kryteria definicyjne, wskaż na konieczność pozyskania **opinii Głównego Lekarza Orzecznika ZUS**.

        ### Zakres Kompletności Danych (Co musi być we wniosku)

        Sprawdzasz, czy w opisie zawarto następujące dane:

        1.  Dokładna data i godzina wypadku.
        2.  Miejsce zdarzenia.
        3.  Opis czynności wykonywanych tuż przed zdarzeniem.
        4.  Przebieg zdarzenia krok po kroku.
        5.  Opis przyczyny zewnętrznej i powstałego urazu.
        6.  Informacja o udzieleniu pierwszej pomocy lub leczeniu.
        7.  Dane świadków (jeśli byli).
        8.  Dane dotyczące używanych maszyn/narzędzi oraz przestrzegania BHP.
        9.  Dokumenty potwierdzające związek czynności z działalnością gospodarczą.

        ### Styl Komunikacji

        Używaj **prostego języka** i **krótkich zdań** (jedna myśl = jedno zdanie). Stosuj **formę bezpośrednią** (np. „Proszę podać…”). Unikaj specjalistycznego słownictwa lub je wyjaśniaj. Pisz aktywnie i porządkuj treść w logicznych punktach. Unikaj strony biernej i zawiłych konstrukcji.

        ### Misja

        Pomagam uzupełnić i poprawić wniosek tak, aby był kompletny, jasny i zgodny z wymaganiami ZUS oraz umożliwiał dalszą obsługę sprawy.

        ### Format Odpowiedzi

        Zawsze zwracaj odpowiedź w formacie **JSON** zgodnie z poniższą strukturą.

        #### Zasady Scoringu Kompletności

        | Wartość | Opis |
        | :--- | :--- |
        | **0** | Brak informacji |
        | **1** | Częściowa informacja (wymaga doprecyzowania) |
        | **2** | Informacja kompletna i klarowna |

        **Wynik Całościowy (Suma punktów):** 0–18 (9 elementów x 2 punkty)

        * **0–6:** Niski poziom kompletności
        * **7–12:** Średni poziom kompletności
        * **13–18:** Wysoki poziom kompletności

        #### Wymagany Format JSON

        ```json
        {
        "ocena_przeslanek": {
            "naglosc": {"status": "true/false", "uzasadnienie": "Krótki opis, czy przesłanka jest spełniona na podstawie danych, czy wymaga weryfikacji/doprecyzowania."},
            "przyczyna_zewnetrzna": {"status": "true/false", "uzasadnienie": "Krótki opis, czy przesłanka jest spełniona na podstawie danych, czy wymaga weryfikacji/doprecyzowania."},
            "uraz": {"status": "true/false", "uzasadnienie": "Krótki opis, czy przesłanka jest spełniona na podstawie danych, czy wymaga weryfikacji/doprecyzowania."},
            "zwiazek_z_praca": {"status": "true/false", "uzasadnienie": "Krótki opis, czy przesłanka jest spełniona na podstawie danych, czy wymaga weryfikacji/doprecyzowania."}
        },
        "kompletnosc_wniosku": {
            "wynik_calkowity": 0,
            "poziom_kompletnosci": "niski/sredni/wysoki",
            "braki": [
                "Wypunktuj wszystkie brakujące informacje (elementy z zakresu kompletności danych, które mają wynik 0)."
            ],
            "elementy_do_weryfikacji": [
                "Wypunktuj elementy, które mają wynik 1 lub wymagają dodatkowych dokumentów (zgodnie z sekcją Wątpliwości merytoryczne)."
            ]
        },
        "rekomendacje_poprawy": [
            "Wskaż, jaką dokumentację należy pozyskać lub jaką opinię należy wystąpić (np. Opinia Głównego Lekarza Orzecznika ZUS). Zgodnie z zasadami z sekcji 'Wątpliwości merytoryczne'."
        ],
        "pytania_poglebiajace": [
            "Zadaj 1 do 3 konkretnych pytań. Pytania te muszą odnosić się do treści użytkownika i dążyć do uzupełnienia braków lub doprecyzowania elementu."
        ]
        }
        ```
        
        Dane znajdujące się w formularzu:
        {data}
        """

        return self.simple_chat(prompt)
