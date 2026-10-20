# Splot — druga sesja Ownera: audyt integralności świata i wiarygodności diagnostyki
**20 października 2026 · druga sesja po poprawce support-query i skrzynek · badanie R&D, nie akceptacja produktu**

## Cel / granice danych
Nowe prywatne załączniki `Splot_Sesja_Badawcza (4).json` (dobrowolny, nadal otwarty 199,09-sekundowy snapshot) i `Splot_Nowy_Rozdzial (1).json` (zapis stanu świata). Plików surowych **nie publikowano w GitHub**; poniżej tylko wybrane agregaty. Nie ma nagrania tej drugiej sesji w tym pakiecie. Wnioski wizualne o tej sesji ograniczają się do geometrii, nie do inspekcji wideo.

**Nie wolno utożsamiać**: pojedynczego eksportu, pełnego replaya, analityki wydajności, kontaktu solvera, rzeczywistej grywalności oraz akceptacji Ownera. Większość wyników z automatycznego Chrome to nadal syntetyczne fixture'y, a nie odtworzenie całego zachowania Ownera.

## Dowody z drugiej sesji
- 397 półsekundowych próbek w oknie 199,09 s; scena **7→132** części: 99 `build-box`, 26 `build-panel`, wszystkie z `ok:true`; w finalnym świecie **104 boxes, 28 panels**, `revision=133`.
- 127 prób `build-crate`: **58 sukcesów, 69 odmów**. Końcowy zapis ma **59 skrzyń** (w tym startowa). Obecna ścieżka `addCrate()` może zwrócić `ok:false, reason:'occupied'` przy negatywnym `clearanceAt()`; stary log przechowywał jedynie `ok:false`, więc nie określa, **które obiekty** odpowiadały za ograniczenie ani czy odmowa była pożądana gameplayowo. Od tej kampanii raportuje `reason` bez współrzędnych.
- Jedna zmiana `anchored→dynamic` dla `support-ne` ok. 66. sekundy; w zapisie jego `min.z=-0.2043` m i `max.z=2.1957` m. Zapis zawiera bieżącą pozycję, ale bez velocity/contact solver state nie jest pełnym snapshotem fizycznym. UI ma eksport, **nie ma importu ani odtwarzania**.
- 35 `authoring-contact-unresolved` (co najmniej część przy rampie), 1 sampled `actor-proximity` z gap≈-0,70 m. Nie traktować tego automatycznie jako zepsutej kolizji Box3D: kontroler aktor–aktor ma osobną politykę; autorujący diagnostyk `clearanceAt` to konserwatywna aproksymacja objętości.
- 397/397 próbek: `rafP50=4,2 ms`, `simCpuP50=0`. Oba pola są wynikiem **median per-render-frame**, nie per-fixed-step; na ekranie ~240 Hz i kroku fizyki 60 Hz wiele klatek nie wykonuje fizyki. Wynik zero jest nieinformatywny, a `4,2 ms` nie wyklucza sporadycznych opóźnień (brak w dawnym JSON p95).
- W trakcie sesji liczba trójkątów rosła od 694 do 3354; mediany geometrii CPU raportowały ~0,1→1,0 ms, submission CPU ~0,2→0,7 ms. Czas ten **nie mierzy GPU**.

## Druga, osobna klasa problemów wizualnych
W 104 bryłach końcowego świata, analizując czyste AABB bez projekcji, stwierdzono:
- **185 par** z dodatnią objętością wspólnej części;
- **54 par** mających współpłaszczyznowe zetknięcie `top↔bottom` z nakładającym się obszarem XY (tolerancja 1 mm);
- **11 par** z nakładającymi się obszarami górnych ścian na tej samej wysokości (tolerancja 1 mm);
- dodatkowo 11 par współpłaszczyznowych pionowych ścian z dodatnim obszarem przecięcia.

To mocny dowód, że **poprawka lokalnej skrzynki (lid/base)** nie usuwa wszystkich źródeł konfliktu depth ani nie reprezentuje powierzchni widocznych *połączenia wielu autorskich brył*. Sama obecność styku nie dowodzi migotania każdej pary: ostateczna widoczność zależy od kamery, zadań GPU, materiału i kolejności rysowania.

**Nie naprawiać** tego przez globalny `polygonOffset` ani zabranianie przecinających się brył. Permissive construction jest zamierzonym kierunkiem. Długofalowo potrzebne jest konsekwentne oddzielanie *authoritative volumes / object IDs / contacts* od wyznaczania zewnętrznych widocznych powierzchni, z lokalną aktualizacją tylko regionów po edycji i bez przekształcania całego świata w jeden collider.

## Korekta telemetrii — wykonana i weryfikowana
W `src/next/perf-metrics.mjs` i `src/next/app.mjs`:
- zliczane są faktyczne kroki fizyki, ich łączny czas CPU, CPU na krok i CPU na sekundę realnego czasu oraz p95 kosztu aktywnych klatek;
- zamiast stałych 180 klatek stosowane jest ~2 s okno *czasowe*; poprzednie 180 klatek oznaczało 0,75 s przy 240 Hz lub 3 s przy 60 Hz;
- w opt-in JSON pozostają historyczne pola median i dochodzą oznaczone `physicsSteps`, `physicsCpuMsPerStep`, `physicsCpuMsPerWallSecond`, `physicsActiveP95CpuMs`, `rafP95` oraz zagregowane przyczyny odmów. Brak automatycznej wysyłki danych.
- `tests/research/perf-metrics.test.mjs`: kontrolowana emulacja 240 Hz / 60 Hz, pauza i catch-up. Nowy runner CI: https://github.com/Jozzpoly/Splot/actions/runs/39454331288 — **48 unit PASS / 0 fail, z oddzielnymi real Box3D-WASM Chrome scenarios**; nadal **nie jest to test telefoniczny ani gra Ownera**.

## Dodatkowy wykryty defekt: fundament czasu i feel nie są niezależne od FPS
W `app.mjs:frame(t)` symulacja działa w stałych krokach `1/60`, ale rendering w rytmie `requestAnimationFrame`. Przy `rafP50=4,2 ms` (~238 FPS) trzy z czterech wyświetlonych klatek mogą widzieć identyczną pozycję z ostatniego 60-Hz kroku, ponieważ nie ma jawnego render interpolation między historyczną i aktualną pozycją solvera. To może powodować schodkowy ruch bez widocznego spadku FPS; **jest hipotezą feelingową wynikającą z kodu, a nie potwierdzonym wideo artefaktem tej sesji**.

Kamera ma bezpośrednie `camTarget+=(body-camTarget)*.16` dla XY i `*.10` dla Z **w każdej renderowanej klatce**. Ta sama matematyczna „sprężystość” ma przy 60 Hz stałą czasową ~95,6 ms, a przy 240 Hz ~23,9 ms (dla XY). Tym samym kontrola wizualna może zmienić charakter około 4× zależnie od monitora. To **źródłowo potwierdzona niezmienniczość złamana**, nie wymaga testu subiektywnego, by stwierdzić defekt kontraktu.

Pętla dodatkowo ogranicza `elapsed=Math.min(.08,wallDelta)` i maksymalnie 4 kroki fizyki na wyświetloną klatkę; przy ciężkich hitchach world-time może zwalniać względem wall-time. Profil powinien w przyszłości rejestrować czas *rzeczywisty* vs *symulowany* i przerwane kroki/catch-up debt, nie tylko medianę fizyki.

**Działanie:** najpierw wydzielić jawny kontrakt `fixed simulation tick ↔ render interpolation ↔ camera smoothing in seconds` i testować 60/120/240Hz oraz drop frames. Czasowe wygładzanie kamery i render interpolation mogą być włączone jako A/B zamiast cichej zmiany istniejącego feel. Nie zmieniać defaultu bez próby Ownera.

## Priorytety wynikające z problemu, nie z rozpędu
1. **Nie dokładać nowej fizyki.** Najpierw odzyskać wrażenia Ownera po poprawce query; testować materialną konstrukcję wielopoziomową jako pełny vertical slice, nie tylko padanie dwóch obiektów.
2. Oddzielić render boundary/occlusion od świata brył. Zrobić kontrolowany A/B na tych samych authored IDs: *per-object naive external faces* vs *locally culled hidden internal faces*, z kosztami CPU, GPU i czytelnością na rzeczywistym urządzeniu. Najpierw jeden proof, nie monolityczny CSG.
3. Zbudować prawdziwe **save → load → inspect → continue** (różne poziomy restartu i replaya opisane osobno); nie reklamować eksportu jako trwałości świata.
4. W instrumentacji mieć niezależne koszty: fizyka na krok, geometria, CPU submit, rAF p95, GPU/wall time, przyczyny `occupied`, jakościowe obserwacje Ownera. Nie traktować dokładnego numeru FPS jako celu gry.
5. Zbadać zmysłową stronę gry: kamera, rozróżnialność obiektów, ślady kontaktów, oddzielenie warstw wysokości, precyzja i naturalność celowania w powierzchnię. Jedna duża różnica w doświadczeniu ma większą wartość niż kolejne 10 PASS.

## Reguły pracy
- Stan repo: PR #3 → #4 → **draft #5**; nie tworzyć szóstego PR dla kosmetycznej poprawki. Main i historia pozostają bez zmian.
- Źródła w `src/next/*.mjs`, samodzielny HTML wyłącznie z `build-next.py` (z kontrolą `--check`); nigdy nie rozwijać ręcznie równoległego bundla.
- CI to bramka regresji i testów fizyki na headless Chrome; **Owner's real device/feel** to osobna bramka. Raporty z każdej gry należy oznaczać wersją/commitem i warunkami testu.
- Nie budować systemów, które zabraniają celowo absurdalnych kształtów — diagnozować i wizualizować ich skutki.

**Pytanie na następny ruch:** kiedy 132 elementy stają się czytelną, grywalną materialną konstrukcją, a nie 132 nałożonymi pudełkami? To istotniejszy problem niż sam pułap 256.
