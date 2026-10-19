# Splot × Reaktywacja Feniksa — presja na prawdę przestrzeni

**19 października 2026. Status: kampania badawcza w obrębie grywalnego Splotu; brak kwalifikacji do `main`.**

## 1. Zakres źródeł i rozdzielenie projektów

Odzyskany historyczny kontekst rozmowy **„Reaktywacja/Reanimacja Feniksa”**, zwłaszcza badań movement/spatial/2.5D z **15–16 września 2026**, stanowi materiał do falsyfikowania założeń Splotu. To nie jest przekazanie Feniksowego designu ani żądanie wspólnego silnika, fabuły czy formatów. Źródłem wykonawczym poniższych wyników jest **kod Splotu z draft PR #2**, a nie uruchomienie Feniksa. Nie twierdzimy, że ponownie przeczytaliśmy całą surową wielotygodniową rozmowę; odtworzony kontekst jest częściowy, choć obejmuje wiele zidentyfikowanych tematów i wcześniejszych ustaleń Ownera.

Rozróżnienie epistemiczne:
- **Owner intent z Feniksa:** ucieleśniony gracz; precyzyjna, responsywna kontrola; geometria i materialność wpływające na decyzje; realna interakcja góra/dół, podpory i wysokości; przebudowa dróg przez przedmioty; permissive world; art, czytelność i minute-to-minute gameplay mają veto nad elegancją symulacji. Nie utożsamiać z wymaganiem natychmiastowej implementacji w Splotcie.
- **Badawcze hipotezy z Feniksa:** semantic 2.5D vs constrained 3D vs pełniejszy substrat 3D; dynamiczna topologia jako potencjalnie wspólna dziedzina; percepcja jako filtr simulation attention; zależność kompetencji aktora od stance, gabarytów i kontaktu; future co-op/SPC. Brak decyzji finalnych.
- **Fakty Splotu:** mierzone w uruchomionym kodzie, z testów poniżej. Nie wolno zastąpić ich teoretycznymi deklaracjami o Feniksie.

## 2. Fundamentalna pomyłka, którą wykazał prawdziwy kod

Po zeszłej kampanii Splot potrafił zbudować wiele ramp i podestów. Ale `updateBoar()` w `src/world.mjs` uznawał jedzenie za osiągnięte tylko na podstawie XY, bez `z`. Jeden świat widziany przez fizykę miał dwie powierzchnie, a ten sam świat widziany przez AI tylko jedną płaszczyznę.

**RED — reprodukcja na konstrukcji z aktualnej gry:**

1. Stawiamy rampę + podest o wysokości **1,8 m** (bez per-scenariuszowej geometrii).
2. Dzik stoi na gruncie bez penetracji kolizji. Jedzenie znajduje się dokładnie nad nim, na podeście, przy takim samym XY. Kod oznaczał je `eaten=true` w **jednym wywołaniu** `updateBoar`.
3. Odwrócenie sytuacji (dzik na pomoście, jedzenie na ziemi) powodowało to samo.
4. Dwa fizycznie dostępne przypadki — oba na gruncie lub oba na pomoście — także działały, więc nie wystarczyłoby zablokować wszelkie jedzenie w pobliżu podestu.

**GREEN — lokalna korekta:** `boarCanReachFood` uwzględnia poziom `z` obok odległości poziomej. Dla różnicy wysokości 1,8 m brak konsumpcji, dla dwóch przypadków na tej samej powierzchni konsumpcja nadal działa. Próg wysokości `0,45 m` jest jawną, prowizoryczną heurystyką zasięgu kontaktu, **nie** finalną definicją pyska, kąta szyi, wysokości pożywienia ani LoS. Brak dynamicznego spadania jedzenia. Nie utożsamiać tej naprawy z kompetencją przestrzenną AI.

Po **600 tickach** na autorskim podeście, przy wysokościach **1,2 / 1,8 / 2,6 m**, wynik to: jedzenie nie zostało zjedzone; dzik pozostał na wysokości gruntu, a płaski planer wykonał **4 planowania** i nie znalazł faktycznej zmiany poziomu. To nadal ograniczenie produktu: ai widzi cel, lecz nie potrafi rozumować o wejściu rampą (mimo że fizycznie może pokonać część takich ramp). Brak konsumpcji po naprawie to uczciwszy **FAIL nawigacyjny**, nie pozytywny wynik autonomii.

## 3. Drugi kontrprzykład: bryła i warunek przejścia to nie to samo

Uruchomiono jedną i tę samą fizyczną próbę prostego wejścia z gruntu na podest o różnych wysokościach, bez dodatkowego kodu per wysokość. Zmierzone po 90 krokach `walk()` + `gravityStep()`:

| Wysokość podestu | Gracz / walec `r=0.30,h=1.64` | Dzik / walec `r=0.37,h=0.83` |
|---|---|---|
| 1,2 m | Dochodzi | Dochodzi |
| 1,8 m | Dochodzi | Dochodzi |
| 2,2 m | Dochodzi | Dochodzi |
| 2,6 m | Dochodzi | Zatrzymuje się w okolicy `x=20,2` przed połączeniem |
| 3,0 m | Zatrzymuje się przy `x≈20,275` | Zatrzymuje się przy `x≈20,2` |

**Uwaga interpretacyjna:** różne zdolności ciał są zgodne z wizją Feniksa i mogą być wartościowe. Problem w tym, że bieżąca odmowa wynika z połączenia kolizji pionowego walca, grubości platformy i progu automatycznego kroku. Nie mamy osobnego modelu nachylenia terenu, przyczepności, stabilności, artykulacji ciała ani locomotor capabilities. Nie promować błędnej geometrii styku do „fizyki dzika” i nie naprawiać jej przez podniesienie jednego magicznego limitu. Wysokość dopuszczona przez edytor nie jest tym samym co dostępność konstrukcji dla konkretnego aktora.

## 4. Odzyskany zestaw pytań Feniksa — matryca falsyfikacji

| Presja z Feniksa | Obecny Splot | Co rzeczywiście musiałoby zostać udowodnione |
|---|---|---|
| Ten sam XY, dwa piętra i dwa ciała | Fizyczne `Z` i dwie powierzchnie mogą współistnieć; nowy test konfliktu ciał i pionowego promienia PASS | Kontakt, strzały, znajdowanie celu i wybieranie warstwy nie utożsamiają poziomów |
| `Support → traversability` | `surfaces()` zwraca kandydatów; `requestedSupport` + kontakt rozstrzygają heurystycznie | Nie każdy kandydat jest legalną możliwością dla każdego ciała; precyzyjnie modelować krawędzie, przeszkody, skoki i schody |
| Skrzynki i materia tworzą nowe drogi | Pchanie/przeciąganie i zrzucanie działa ograniczenie; nowe podesty statyczne | Gracz buduje i niszczy legalne niestandardowe trasy; obiekty mają stosowne podpory i konsekwencje utraty podparcia |
| Pocisk z wieży, daszek, osłona | `raycast` działa w XYZ; brak pełnego gameplayu pocisków | Punkt celowania i kolizja bryły są zgodne z faktycznym `Z`, renderowanym celem i zasłonięciem |
| Nawigacja po powierzchniach + połączenia | **FAIL zakresu:** dzik ma XY-only A* i cel z `z` w kluczu, nie w stanie planera | Nawigacja rozróżnia `(x,y,surface/support)` i legalne linki, a nie tylko komórki XY; dynamiczne blokady/zmiany są spójne |
| Wiedza zwierzęcia i percepcja | **Brak:** AI zna cel i geometrię całego świata | Zrozumiałe, ograniczone źródła obserwacji; osobno prawda świata i aktualna wiedza agenta |
| Pełne zasłanianie, przekrój, wybór powierzchni | Render painter + heurystyczny cutaway, częściowy screen-pick | Można wskazać niższą i wyższą powierzchnię bez kłamania o ich fizycznym miejscu; cutaway jest *trybem widoku* |
| Contact, stance, masa, carrying | Proste kinematyczne przesuwanie i stały offset chwytu | Mechaniczne konsekwencje różnych ciał; nacisk/ciężar i opór wynikają z modelu, nie z zakazu skryptowego |
| Możliwość przebudowy podczas działania | Edytor stawia preset rampy+podestu; nie edytuje geometrii poszczególnych elementów | Live zmiana geometrii ma lokalne, przewidywalne następstwa; świat nie traci historii ani pracy autora |
| Sensoryka i materiałowy język świata | Nadal mocno laboratoryjny i podobny wizualnie | Forma, warstwy, materiały i reakcje informują o geometrii i czynnościach — bez proceduralnego wypełniania monotonnych assetów |

## 5. Co zmienić w naszych decyzjach, a czego nie wdrażać automatycznie

1. **Dwie reprezentacje mogą mieć różne zadania, lecz nie mogą przedstawiać różnych prawd.** Geometria authoruje przyczyny; podpory, objętości i promienie z niej wynikają. Planer, percepcja i renderer mają jawnie deklarować, których pytań *nie rozstrzygają*. Samo dzielenie trójkątów pomiędzy renderingiem i raycastem to początek, nie meta-gwarancja.
2. **Navigation ≠ geometry ≠ epistemics.** Najbliższa uczciwa próba: dwa połączenia rampami prowadzące na ten sam podest, trzecia droga utworzona przez Ownera; zapytania o osiągalność dla dwóch różnych ciał. To można zrobić jako osobny *oracle dla testów*, bez wpychania od razu wiedzy absolutnej do mózgu dzika.
3. **Support graph nie jest jedną uniwersalną mapą.** Dla ciężkiego ciała, lekkiego goblina i człowieka ten sam link może być przechodni albo nie; carried crate zmienia envelope. Moduł może przedstawiać kandydujące powierzchnie i krawędzie, ale poprawność zależy od ciała, stance, wejścia, zdolności i aktualnych przeszkód.
4. **Zachować rywalizujące substraty.** Semantic 2.5D może wygrywać prostotą budowania 2D-like; ograniczone 3D może wygrać kolizją i raycastem; authored 2D z iluzją może wygrać feelingiem w wąskim zakresie. Obecne próby nie dają prawa wybrać zwycięzcy. Solvera 3D nie ocenimy uczciwie bez rzeczywistego podłączenia.
5. **Gameplay veto.** K3 przegrało, ponieważ poprawna lokalnie geometria usunęła chwyt, dzika, świat i czytelność. Przyszła próba nawigacji/percepcji nie może odbyć się kosztem tej samej utraty doświadczenia. Wizualność, mobile i realny akt autorski muszą być równoległymi obszarami oceny.
6. **Nie przeszczepiać Feniksa do Splotu.** Combat, i-frame'y, stance tankingu, SPC/social ownership, LOD's World i co-op to materiały porównawcze lub dalekie presje, nie lista prac tej kampanii. Żadnego wspólnego finalnego formatu Studio, globalnego data ontology i fikcyjnego adaptera do Jaskini.

## 6. Wykonane testy, dowody i otwarte zadania

**Nowe:** `tests/vertical_affordance.test.mjs` (w tym RED→GREEN dla dwóch przypadków fałszywego jedzenia przez podest), `tools/feniks_pressure.mjs` (raportuje zderzenie zakresów contact/nav). `src/world.mjs`: tylko wąski kontrakt kontaktu pożywienia z fizyczną wysokością. Nie zmieniano renderera ani sterowania.

**Wynik jednostkowy po zmianie:** 107 testów = **104 PASS, 3 TODO, 0 FAIL**. Wcześniejszy stan: 100 = **99 PASS, 1 TODO, 0 FAIL**. Dwa nowe TODO dotyczą ścieżek wielopoziomowych i realnej percepcji; nie stanowią testów dowodzących wad, a jawne braki. `node tests/stress.mjs` i `node tests/authoring_chaos.mjs` przeszły osobno; zakres danych w logach. `tests/verify.sh` został uruchomiony, ale cały ciąg nie zakończył się w limicie procesu — ostatni test przeglądarkowy `browser_scaffold.py` uruchomiony osobno i zakończony PASS. Pozostałe starsze testy Chromium/mobile wykonały się przed przerwaniem procesu. Nie nazywać tego „jednym ciągłym pełnym PASS”.

**Dane wykonawcze** (research-only): `node tools/feniks_pressure.mjs`, JSON diagnostyczny tej kampanii. Każdy przypadek ma geometrię wygenerowaną przez *prawdziwe* `placeScaffold`, bez tworzenia osobnej gry. Dane pokazują, że fizyczna możliwość i dwuwymiarowy plan mogą mówić różne rzeczy.

**Nieudowodnione nadal:** poprawność LoS w pełnym świecie, 2.5D surface-nav, zachowanie ciała na rzeczywistym nachyleniu, przekaz informacji do NPC, poprawny renderer z selekcją warstw, żywa edycja wymiarów, prawdziwy rozkład ciężaru, pociski i przeniesienie pracy do Studia. Test na fizycznym telefonie Ownera pozostaje otwarty. `main` nadal jest grywalnym punktem odniesienia; ten eksperyment nie powinien automatycznie go zastąpić.

## 7. Następny warunek przyjęcia większej zmiany

**Jeden żywy kawałek świata**, gdzie: (a) gracz i małe zwierzę na różnych wysokościach mogą bezkolizyjnie przejść nad/pod sobą, ale nie mogą się magicznie dosięgnąć; (b) widoczny dla nich cel wymaga rzeczywistej drogi i może być nieosiągalny; (c) gracz przesuwa przedmiot blokujący lub otwierający przejście; (d) na ekranie można jednoznacznie rozpoznać i wskazać warstwę; (e) swoboda K2, chwyt i mobile nie ulegają regresji. Co najmniej **dwie autorsko odmienne konfiguracje**. Odtwarzalne testy mogą stwierdzić brak penetracji i brak fałszywego jedzenia, ale nie ocenią pełnej zabawy za Ownera.

Żadnego awansu „nowego systemu nawigacji” na podstawie pomyślnego przejścia z punktu A do B w jednej gotowej scenie.
