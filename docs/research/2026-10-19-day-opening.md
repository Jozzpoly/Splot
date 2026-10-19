# Splot — odzyskanie dnia i kontrola kierunku

**19 października 2026 — poranny checkpoint.** Status: źródła oraz testy odczytane/uruchomione; **bez awansu nowej gry i bez decyzji o silniku**. Ten dokument nie zastępuje doświadczeń Ownera.

## 1. Co odzyskano z ostatniej linii

Punkt ciężkości był przesuwany kolejno od żywego świata i bezpośredniej materii (A2, eksperymenty obrazu) przez Forge i kinematyczny chwyt (K2), do generalizacji konstrukcji i wielu poziomów. Pierwsze wyraźne emocjonalne potwierdzenie dotyczyło *możliwości przeżywania przestrzeni*, nie wysokiego wyniku testów. K3 geometryczne przyniosło **Owner FAIL** jako gra: zniknęły chwyt, eksploracja, zwierzę, jakość obrazu. Po powrocie do K2 dodano zrzut skrzyni, poprawki podpór, mobilny joystick i nowe budowalne rampy/podesty, zachowując grywalną całość. W PR #2 pojawiło się następnie rozróżnianie wysokości w kontakcie z celem dzika (nie je przez podest).

Ostatnia, jeszcze późniejsza kampania z tej rozmowy: planer dzika szukał dróg po autorskich rampach, znalazł trasę przez dwa podesty, zyskał porcjowane planowanie, obsługę przebudowy topologii i walidację trasy przy imporcie. **To są wyniki relacjonowane w rozmowie; nie zostały odnalezione w GitHubie ani w dostępnej kompletnej paczce. Nie wolno ich deklarować jako aktualnych możliwości repo.**

## 2. Ground truth na wejściu

- GitHub `Jozzpoly/Splot`, `main` = `cd9e5d0a18216f45ec65f5f8515f0d4c57f827bd`.
- Draft PR #2, branch `research/spatial-truth-2026-10-19` = `b60ecce503790975ea219c7b86dc2ba17117dfaa`. Jest to **ostatni opublikowany research**; posiada konstrukcje, poprawkę vertical food-contact, ale nie późniejszą surface navigation.
- Odtworzono lokalnie źródła z `Splot_Live_Scaffolds_2026-10-19.zip`, przeniesiono wąską poprawkę `boarCanReachFood` z zatwierdzonego commita; `src/world.mjs` ma dokładny identyfikator Git blob `2940bfa448ec372d8e44e46ab5a1d8a67d75ac7a` i zbudowany HTML identyczny z opublikowanym PR (`37507129d3c097a6b8deaab140a6da9e6fd0360a` jako Git blob).
- `node --test tests/*.test.mjs` dla **odzyskanej paczki**: 99 PASS / 1 TODO / 0 FAIL. Nie jest to pełne 104 PASS / 3 TODO z repo, ponieważ w archiwum brak późniejszego pliku testów.
- Stres i chaos autorskich zmian: dziś przeszły. `browser_scaffold.py`: desktop / portrait / landscape sprawdzone, usuwanie na krajobrazowym **nie zostało przetestowane (poza kadrem)**.
- Pierwsza bramka mobilna **FAIL**, lecz przyczyną okazał się błędny scenariusz: joystick przesuwał postać od skrzyni przed drugim dotknięciem. Korekta kierunku na zbliżanie wykazała rzeczywisty chwyt i przesuwanie skrzyni na 320×568, 393×852 i 844×390; żadnego zaznaczania tekstu i przewijania. To weryfikacja **emulacji**, nie komfortu na fizycznym telefonie.
- Drugi stary test browser_gameplay polegał na sztywnych 590 ms przytrzymania i zgłaszał FAIL, zanim wolniejsze Chromium zdążyło dojść do krawędzi. Po oczekiwaniu na faktyczne zerwanie chwytu z powodu utraty podparcia pełny test przeszedł na wszystkich badanych ekranach. **Kod produktu bez zmian, poprawiono dwie bramki testowe**.

## 3. Ocena, co dziś rzeczywiście ważne

**Nie powtarzać wczorajszej bezwładnej eskalacji A*.** Surface-nav to interesujący eksperyment i donorskie evidence, ale jego nieopublikowany wynik nie powinien uzurpować sobie pierwszeństwa nad aktualnymi, niezadowalającymi: obrazem poziomów, perspektywą, mobilną ergonomią oraz swobodą prawdziwego manipulowania konstrukcjami. Owner wielokrotnie podkreślał jakość minute-to-minute, cielesność, art i grywalność jako veto nad elegancją symulacji.

Najbardziej wartościowy odczyt dzisiejszego kadru „Warsztat wysokości”: płaskie jednobarwne powierzchnie wypełniają dużą część telefonu, czasowy komunikat UI nachodzi na konstrukcje, a rysowanie nadal jest painter-sortingiem opartym na przybliżeniu `z+h+0.57*y` z lokalnym cutaway. To **nie jest poprawna widoczność XYZ ani świadomy język grafiki**. Obraz musi pomagać rozpoznawać aktualną podporę, przestrzeń pod/na, krawędź i miejsce, gdzie spadnie przedmiot; sama zmiana kolejności sprite'ów nie rozstrzyga ray/occlusion/picking.

Splot nie powinien być podporządkowany Feniksowi ani Studiu: Feniks dostarcza kontrprzykłady praw świata, Studio może dostarczać narzędzia autorstwa i warianty, Jaskinia może zapewniać wejście/organizację. Nie ma zgody na jeden uniwersalny format 2D/2.5D/3D ani na utożsamienie dokumentu konstrukcji z żywym snapshotem.

## 4. Kolejność kampanii po odzysku

**Kampania A — natychmiast i bazowo: integralność doświadczenia i pomiarów.** Sprawdzić rzeczywiste sekwencje ruchu jedną ręką + chwytu drugą, zrzutu, edycji, własnego zapisu, przejścia nad/pod bez regresu i automatycznego uznawania jednego scenariusza za całość. Testy mają czekać na observable consequence, odnotowywać fałszywe alarmy i ograniczenia rozdzielczości; bramki przeglądarkowe osobno zamiast timeoutu jednego ogromnego skryptu. Z tego etapu dziś naprawiono dwa błędnie zaprojektowane testy.

**Kampania B — przestrzeń od strony Ownera, nie od silnika.** Na **tym samym grywalnym** warsztacie wprowadzić i falsyfikować poprawniejszą reprezentację wysokości: actor-on-top / actor-under, dwie powierzchnie trafione w jednym ekranowym promieniu, odróżnialna okluzja i celowany cutaway; nie ruszać fizyki wyłącznie dla obrazka. Porównać referencyjne kadry oraz interakcje przed/po w portrait/landscape. Art/legibility i bezpośrednia kontrola są równorzędnymi bramkami, nie późniejszymi kosmetykami. Wybór głębszego renderera po tej próbie, nie teraz.

**Kampania C — odzysk nawigacji i falsyfikacja.** Dopiero po A/B należy odtworzyć brakującą implementację ze specyfikacji testów: dwa podesty, połączenie rampą, trasa dłuższa niż limit, reakcja na usunięcie i odbudowę, budżet inkrementalnych rozwinięć oraz snapshot w trakcie wyszukiwania. Ważna korekta: kompletne testy trasy i kosztów mogą istnieć przed podłączeniem dzika, a aktor-specyficzny reachability oracle nie musi być wszechwiedzącym mózgiem NPC. Publikować jako draft, nie dorabiać opowieści o ukończonej autonomii.

**Kampania D — dawstwo Studio/Jaskinia.** Wąski przepływ: konstrukcja jako świadomy dokument/parametry → import do osobnego runtime Splotu → kontakt i optyka → powrót do edycji. Każda warstwa zachowuje własną odpowiedzialność. Bez dotykania repo innych agentów w tej fazie.

## 5. Dyscyplina wydań i granice

- Jeden grywalny baseline (`main`) stale dostępny; badawcze PR-y nie są prezentowane jako nowe wersje bez Owner review.
- Test pozytywny to dowód konkretnej własności, nie ocena gry. Test czasowy w emulacji nie stanowi Owner testu.
- Utrzymywać osobno trzy rejestry: *udowodnione*, *jawnie nieudowodnione*, *Owner FAIL*. Żadnego domykania FIZYKA/RENDER/AI na podstawie przejścia lokalnego testu.
- Wynik „brak drogi” odróżniać od „nie zmieściło się w budżecie” i „właśnie przeliczam”. Brak kompletnego NAV w repo to priorytet ciągłości, ale nie pretekst do dzisiejszego bezkrytycznego rewrite'u.
- Nie przesyłać prywatnych nagrań ani zapisów Ownera do publicznego repo; nie dublować wielomegabajtowych paczek; nie generować wielu kanonicznych branchy.

## 6. Najbliższe wykonanie

1. Utrwalić dzisiejsze poprawki testów jako weryfikowalny, mały commit badawczy; sprawdzić repo po zapisie.
2. Zbudować jeden *Owner-scenario quality gate* na dwóch wysokościach: ciało, skrzynia, wybór poziomu i obraz na telefonie, z jawnymi FAIL-ami, bez ogłaszania nowego silnika.
3. Podważyć renderer/przestrzenny picking w rzeczywistej, mieszanej scenie i zestawić proste opcje; dopiero wtedy wybrać dalszą implementację.
4. Odtworzyć i zamknąć source-of-truth problem nieopublikowanego surface-nav; dalsza praca z kodem tylko w repo i z testami.

**Rozliczenie dzisiaj:** na chwilę tego checkpointu zrobiono przede wszystkim odzyskanie źródeł, uruchomienie realnych testów i naprawę dwóch niewiarygodnych bramek. Nie zbudowano nowego gameplayu, nie rozwiązano renderera XYZ, nie odnaleziono źródeł późniejszej nawigacji. Ta granica jest zamierzona, bo największym długiem nie była liczba mechanik, ale niewiarygodność oceny ich wartości i stanu.