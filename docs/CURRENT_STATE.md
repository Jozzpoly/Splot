# Splot / stan roboczy — 18.10.2026

**LIVE TRUTH:** Splot K2 jest grywalnym punktem odniesienia. Ta gałąź rozwija go, nie zastępuje K3. Nie ma zatwierdzonego nowego core, wybranego silnika ani ostatecznej projekcji 2.5D.

**EVIDENCE:** `node --test tests/*.test.mjs` 72 PASS; `node tests/stress.mjs` 18 000 ticków i 90 000 weryfikacji bez wykrytej przenikalności przy ograniczonych seedach; dodatkowo 9 000 ticków chaosu edycji / 105 474 kontroli brył bez stwierdzonych naruszeń. Browser: `browser_gameplay.py` (desktop, portrait, landscape, real touch CDP + kliknięcia), `browser_view.py` (cutaway nie zmienia snapshotu), `browser_depth.py` (przegląd kadru). UI nadal wymaga Owner testu na prawdziwym urządzeniu.

**ZACHOWANE:** K2 84×54, ruch i chwyt, skrzynie, kamienne przeszkody i mury, dzik, autorska edycja, stan JSON, minimapa, ślady i prowizoryczna ekspresja postaci. Wersja nie udaje pełnej gry; najpierw trzeba zasłużyć na jego promocję do właściwego Splotu.

**NAPRAWY:** lokalny grip po usunięciu obcego mostu, zrzut podparty→lot→lądowanie, wsparcie częściowego obrysu skrzyni, sterowanie człowiekiem w powietrzu, rampa jako cienka płyta (support/contact/raycast z powiązanej geometrii), trzy tryby podglądu bez zmiany state, test historycznego zapisu Ownera (tylko lokalnie, nie w publicznym pakiecie).

**ZNANE GRANICE:** zrzut bez momentu obrotowego; ścisłe cylinder/AABB i thin-plank approximation; brak przełożenia praw na drugą budowaną rampę; konflikt wielociałowy; brak rzeczywistej lokalnej percepcji dzika; podparcie `body:` pozwala na niezręczne stanie na głowie; autorstwo edytorem vs działanie postaci; brak pełnej okluzji i pewnego surface picking; placeholderowość artystyczna.

**DECYZJA:** nie przepisywać całego K2 tylko po to, by wygrać test geometrii. Odważne alternatywy badać w odrębnej kuźni; grywalny kandydat wymaga pełnej bramki doświadczenia.

**NASTĘPNE ROZSTRZYGNIĘCIA:** prawdziwe zachowanie wielociałowe i ciężar w gotowym solverze; authoring drugiej konstrukcji bez specyficznego kodu; kamerowy wybór aktywnej powierzchni; art direction Splotu i Ownerowe próby długiej zabawy.
