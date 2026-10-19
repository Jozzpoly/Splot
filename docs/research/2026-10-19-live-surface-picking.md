# Splot — screen-picking z jawną warstwą, kampania wykonawcza

**19.10.2026 — niepromowany kandydat badawczy w istniejącej grywalnej grze.**

## Uzasadnienie i RED

Owner zgłosił wielokrotnie problem nieczytelnych poziomów i nieprzewidywalnego działania edytora 2.5D. W dotychczasowym `src/app.js` ten sam fizyczny piksel na historycznym moście mógł oznaczać `ground z=0` albo `bridge z=2.6`, zależnie od sterowanej postaci. To iluzja autorstwa, nie prawdziwy picking. Wczorajszy czerwony kontrprzykład jest w `tools/repro_screen_pick_ambiguity.py` (GitHub PR #2).

**Nowy RED→GREEN**: 5 prób kernela w `tests/surface_picking.test.mjs` pierwotnie dało 4 FAIL (brak funkcji wskazywania górnej i dolnej warstwy, brak wsparcia nowego podestu przy stawianiu, przypadkowe usuwanie konstrukcji) i 1 PASS; po zmianach 6/6 PASS. Test `tests/browser_surface_selection.py` początkowo FAIL, ponieważ nie istniał przycisk wyboru powierzchni. Rozszerzony test GUI ponownie pokazał FAIL: usuwanie usuwało sam podest pod skrzynią, zamiast skrzyni; naprawiono kolejność. Nie ma osobnego nowego forka gry ani zmiany świata poza kontraktem stawiania i usuwania w edytorze.

## Implementacja — i jej rzeczywiste granice

1. `pickSurfacesAtProjection(w,x,groundY)` w `src/world.mjs` oblicza linię świata odpowiadającą wskazanemu pikselowi. Zwraca uporządkowane cele: `ground`, stary `bridge`, rzeczywista bryła historycznej rampy oraz górne trójkąty autorskich płyt. Dwa różne poziomy nie są scalane. Działa na współrzędnych świata bez odwołania do `selected`.
2. Edytor korzysta z jednej jawnej warstwy do `placeObject` i `eraseNear`; umie postawić skrzynię na autorowanym podeście. Tylko zmiana opcji `Warstwa` / `Q` nie mutuje świata. Nałożone na siebie obiekty można usuwać osobno. Jeśli skrzynia stoi na autorskim podeście, pierwsze usunięcie zabiera skrzynię, dopiero drugie pustą powierzchnię.
3. `src/app.js` pokazuje mały podgląd wskazywanego celu i jego wysokości, wybór warstwy jest jawny (`Q` desktop, `↕` w górnym pasku telefonu podczas edycji). Nie dotykano głównego sterowania joystickiem, chwytu czy systemów dzika. Pozycja wskaźnika odnawia się przy ruchu kamery; podgląd nie jest zapisywany jako stan świata.
4. Warsztat `Konstrukcja` nadal wymaga wskazania gruntu. Autorskie mury na podwyższonych podporach nadal mają niepełny model konstrukcyjnej nośności. Wskazanie obiektu to nie to samo co fizyczne chwycenie go postacią.

## Weryfikacja lokalna, po zmianach

- `node --test tests/*.test.mjs`: **105 PASS / 1 TODO / 0 FAIL** (106 testów w lokalnie odzyskanej paczce). To NIE są wszystkie testy z PR #2: późniejsza paczka z testami presji Feniksa nie była częścią odzyskanego lokalnie ZIP. Produkcyjne `world.mjs` na starcie kampanii odtworzono bajtowo identyczne z Git blob `2940bfa448ec372d8e44e46ab5a1d8a67d75ac7a` przed zmianą.
- Stres: 18 000 kroków, 90 000 kontroli ciał, 0 wykrytych przenikań w zakresie próby.
- Chaos autorski: 597 zatwierdzonych zmian, 319 usunięć, 100 zapisów, 0 zgłoszonych naruszeń w zakresie dystrybucji testowej.
- Nowe realne Chromium: `browser_surface_selection.py` desktop/portrait/landscape PASS. `browser_surface_selection_extended.py` desktop, 393×852, 320×568, 844×390 PASS dla górnej/dolnej skrzyni, przełączenia aktora i niezależnego usuwania; oddzielnie PASS dla skrzyni na autorowanym podeście i jego bezpiecznego usuwania.
- Starsze bramki Chromium wykonane osobno: `browser_gameplay.py`, `browser_scaffold.py`, `mobile_owner_contract.py`, `browser_view.py`, `browser_depth.py`, `mobile_rotation.py` PASS w sprawdzonych przypadkach. `browser_scaffold.py` nadal **nie** testuje usunięcia podestu na poziomym telefonie poza kadrem. Jeden duży skrypt sesji miał timeout mimo poprawnie zakończonych wcześniejszych etapów; pozostałe wykonano osobno.
- Testu Ownera na fizycznym telefonie BRAK. Testy nie dowodzą przyjemności gry.

## Bardzo ważne NIEUDOWODNIONE

- **Nie ma poprawnej okluzji 2.5D.** Painter i heurystyczny cutaway nie zawsze przedstawiają prawdę głębi. Wskaźnik może wybrać świadomie powierzchnię przykrytą inną; nie znaczy to, że obraz ją poprawnie pokazuje.
- Lista celów dotyczy na razie *chodzonych górnych powierzchni*. Nie obejmuje ścian bocznych, indywidualnych trójkątów brył jako edytowalnych części, górnych ścian wszystkich `solids` ani dynamicznych brył jako osobnych promiennych hitów. Nie promować jako finalnego Studio editor-picking API.
- Nie wspiera dowolnej liczby przecinających się płaszczyzn >8 m nad gruntem ani zaawansowanej projekcji kamery; wzór promienia jest zgodny z bieżącą ortograficzną projekcją Splotu, nie jest ogólnym raycasterem 3D.
- Na telefonie pojedynczy tap nadal wykonuje operację. Wybranie innej warstwy wymaga przycisku; **brak osobnego trybu „tylko podejrzyj cel bez edycji”** i testu ergonomii Ownera. Warstwa jest preferencją liczbową (pierwszy/drugi hit), a nie trwałym identyfikatorem architektonicznego dokumentu.
- Nie poprawiono zjawisk fizycznych chwytu, obrotu, wyważania skrzyń, nośności podpór, percepcji dzika ani rendererowych pomyłek. Nawigacja powierzchniowa z końcówki wczorajszego runu nadal jest nieopublikowana; nie przepisywano jej z pamięci.

## Kolejny falser

W *tej samej grywalnej scenie* wprowadzić dwa nakładające się geometrycznie przejścia z ciałami i skrzynią: porównać per-face painter z prawdziwym rozwiązywaniem zasłaniania XYZ (renderowanie ortograficzne) oraz świadomym oznaczonym przekrojem. Ocena: ruch ciał pod/nad rampą, oba wybieralne poziomy, spadanie przedmiotu, camera framing i sterowanie na 320px. Odrzucić kandydata, który jest poprawny tylko na jednym zatrzymanym kadrze. Nie zamrażać art direction ani nie wybierać silnika przed testem feel.

**Status:** kandydat do oceny, nie Owner-accepted i nie awans do `main`.
