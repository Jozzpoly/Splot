# Splot Next — krótki przewodnik do swobodnej zabawy

**Stan 26 października 2026 · badawczy [PR #5](https://github.com/Jozzpoly/Splot/pull/5), nie `main`.** Żaden test nie oznacza jeszcze akceptacji odczuć z gry przez Ownera.

## Uruchomienie
Otwórz lub pobierz pojedynczy [**Splot_Next_GRAJ.html**](../src/next/Splot_Next_GRAJ.html) z **gałęzi PR #5**, przez **Download raw**, nie historyczne `index.html` z `main` (K2). Wymagany internet: Box3D WASM pobiera się z CDN. Po uruchomieniu sprawdź napis **„Box3D · aktywna fizyka badawcza”**. **AWARIA / fizyka AWARYJNA** oznacza fallback, a nie test prawdziwego Box3D.

## Najprostsza zabawa
Poruszaj się **WASD**, obracaj kamerę **prawym przyciskiem myszy**, łap/puść skrzynię przez **E**. Możesz spontanicznie budować skrzynie i autorskie bryły/płyty, poprawiać je, zwalniać zakotwiczone bryły i patrzeć na fizyczne skutki. **Q / Warstwa** zmienia cel wśród nakładających się części; sprawdź obrys zaznaczonego elementu, zanim go usuniesz. **Cofnij/Ponów** dotyczy historii operacji autora — **nie** cofa czasu symulacji. Na telefonie istnieją joystick/kamera i proste działania, ale inwestycję w mobilne edytowanie mapy odłożono; nie jest to wymagany test.

Warto zwracać uwagę przede wszystkim na chwile **„chciałem to zrobić, ale...”**, niezrozumiałe reakcje, trudne wskazywanie materiału i sytuacje zachęcające do dalszego eksperymentu. Nie potrzeba uruchamiać skryptów testowych ani odczytywać debuggera.

## Zabezpieczenie
**Zapis JSON** pobiera plik lokalnie. **Wczytaj JSON** wymaga potwierdzenia zastąpienia bieżącego świata; Anuluj pozostawia go nienaruszonym. Po imporcie fizyka jest zatrzymana — kliknij **Uruchom**. To świeża inicjalizacja solvera z pozycjami i częściami, nie dokładne odtworzenie prędkości, impulsów ani historii. **Nie powierzaj prototypowi niezastępowalnych konstrukcji bez oddzielnego zapisu.** Brak autosave. Reset wymaga dwóch świadomych działań.

Najważniejszy nierozwiązany problem: bardzo gęste układy części przecinających się ze skrzyniami potrafią wywołać gwałtowny wyrzut ciał poza świat. Gdy nowa bryła przecina skrzynię, zobaczysz ostrzeżenie, **nie zakaz**; to diagnoza geometryczna, nie naprawa fizyki. Zwiększenie liczby podkroków nie stanowi rozwiązania. Fizyka, kamera, płynność, czytelność, ogólny *feel* i rzeczywisty telefon **nie mają jeszcze akceptacji Ownera**.

## Status bez technicznego obowiązku
Ostatni pełny test techniczny: [Chrome + Box3D #40329727361](https://github.com/Jozzpoly/Splot/actions/runs/40329727361), **94 PASS / 0 FAIL / 2 TODO**. Dodatkowe warianty optycznej percepcji dzika, powierzchni i animowanej orientacji są **wyłącznie opcjami badawczymi** — nie nowymi domyślnymi zasadami. [Stan agentowy](research/CURRENT_EXECUTION_STATE.md) i [historia dowodów](START_NEXT_SESSION_2026-10-21.md) istnieją dla agentów; do zwykłej zabawy nie trzeba ich czytać.
