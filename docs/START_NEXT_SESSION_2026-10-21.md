# Splot — punkt odzyskania po kampanii 19–20.10.2026

> **Aktualizacja po wznowieniu pracy, 20.10.2026, ok. 16:05 czasu polskiego — uzupełnia nocny checkpoint.** Pierwsza poważna bramka jest teraz **zaliczona w rzeczywistym Chrome + Box3D WASM**, nie tylko w mocku. GitHub Actions [39435938142](https://github.com/Jozzpoly/Splot/actions/runs/39435938142) wykonał 4/4 scenariusze fizyczne (uwolnienie/reanchor; górna bryła ląduje na dolnej, po usunięciu podpory spada; rampa; upadek człowieka po usunięciu pomostu), faktyczne kliknięcia desktopowego edytora, pobranie i weryfikację JSON oraz syntetyczny dotyk w emulacji 393×852. Deterministyczne testy Node: **38 PASS, 2 TODO**. Zastrzeżenia starszego checkpointu o *niewykonaniu testu WASM* dotyczą stanu nocnego i są już nieaktualne; **nie** oznacza to fizycznego testu telefonu, akceptacji Ownera, ruchomych podpór pod graczem, obrotów, 1k obiektów ani jakości obrazu.

**Agent-only entrypoint · stan źródłowy: draft PR #5 · bez promocji na main**

**Najkrótsza prawda:** Splot jest projektem grywalnego, żywego, materialnie konsekwentnego świata, a nie laboratorium czystej geometrii. W ciągu tej kampanii przeszliśmy od ślepego limitu K2/painter do odrębnego XYZ + depth + Box3D Donor i pierwszych realnych testów Ownera. To ważna poprawa, ale nowe konstrukcje dynamiczne (PR #5) **nie są jeszcze sprawdzone na realnym Box3D**. K2 pozostaje punktem kontrolnym, a preferencja Ownera to **Box3D**, nie bezwzględny nakaz ani dowód wyższości solvera.

## 1. Początek i zmiana myślenia
- Długoterminowa inspiracja Feniksem: świat, w którym powierzchnie, wysokość, widoczność, kontakt, poruszanie, fizyczne przeszkody i decyzje aktorów nie przeczą sobie. Splot **nie jest implementacją Feniksa** ani wspólną architekturą Medium/Jaskini/Studia.
- K2 miał chwyt, skrzynie, sceny, dzika, budowanie i charakter zabawy, ale painter oraz powierzchniowe przybliżenia nie potrafiły pokazać częściowej okluzji człowieka pod pomostem ani spójnej pozycji/warstwy pod jednym punktem ekranu.
- K3 wygrywał lokalne testy geometrii i przegrywał w rękach Ownera: utracił cały szereg czynności gracza, obraz i charakter. **Nie powtarzać podmiany gry testowo eleganckim laboratorium.**
- Wcześniejszy research PR #2: jawne wskazywanie poziomu, próby geometrii i nawigacji; historyczny zaawansowany wariant surface navigation z wcześniejszej lokalnej sesji **nie został wiarygodnie odzyskany jako pełne opublikowane źródło**. Nie podpisywać pod nim obecnego repo ani nowego dzika.
- PR #3: osobny, grywalny kandydat XYZ + wspólne query o geometrię/podparcia/picking + WebGL depth / software fallback, porównywany ze starym K2. To nie „ukończone 2.5D”.
- PR #4: zaimplementowany **prawdziwy istniejący Box3D Character Controller Donor** (nie naiwny nowy cylinder). W realnym browserze przeszedł rampę i usunięcie podpory. Rapier również. Syntetyczny początkowy test chwytu Box3D był RED; Owner w prawdziwej sesji z powodzeniem prowadził skrzynię na rampę i podest, co falsyfikuje ogólne twierdzenie, że grip jest praktycznie bezużyteczny.
- Rapier posiadał własną kinematyczną kolizję gracza i dzika, która Ownerowi wydała się niestabilna i nieprzyjemna. Box3D pozwalał im się przenikać, **ponieważ adapter w ogóle nie tworzył colliderów aktor–aktor**, a nie dlatego, że Box3D rozwiązuje ten kontakt lepiej. Impulsowy „soft contact” w badaniu nie zatrzymywał przenikania; nie promować go jako naprawy.
- Dzik stawał przy jedzeniu, bo był już wewnątrz progu celu 0,8 m, a nie dlatego, że zawiesił się Box3D. Alternatywna reakcja na bliskość gracza została dodana jako odwracalna opcja, bez udawania pełnego AI/percepcji.
- PR #5: pierwsza próba cyklu życia autorskiej bryły `anchored → dynamic → anchored`, z tożsamością ID, współdzielonym światem i zablokowaną rotacją (AABB nie potrafi reprezentować orientacji). Jednostkowy model i adapter z **mockiem** były zielone, ale rzeczywisty dynamic-part WebAssembly / kontakty, body support, real phone i Owner feel **nie zostały zaliczone**.

## 2. Dwa realne prywatne testy — nie publikować surowych plików
**Pierwszy:** 189 zdarzeń / około 61 s opt-in zapisu, 7 części, Box3D. Chwyt przez około 10,38 s; skrzynia była transportowana po rampie i przez podest. Późniejszy boar gap i nieruchomość dały prawidłową diagnozę `feeding`.
**Drugi:** 275 zdarzeń / 76,86 s, start zapisu świata przy t≈52 s, Box3D. 7 × `build-box` i 4 × `build-panel`, wszystkie `ok:true`. Liczba części **7 → 18**. `dynamicParts:0` we wszystkich próbkach: test dotyczył **budowania statycznego**, nie fizycznego uwolnienia z PR #5. Dwukrotnie widać release chwytu z `reason:'separation'` (12,34 s i 15,38 s). Eksport ma `inProgress:true`; nie przedstawia kompletnego zamkniętego replaya.
**Wniosek Ownera:** grywalność i swoboda eksperymentu zaczęły się bronić pomimo prymitywnego obrazu. Jednocześnie rozwój odczuwa jako bardzo wolny, zbyt dużo funkcji i raportów, za mało przełomów w doświadczeniu. Jego spontaniczny test ma priorytet dowodowy nad unit PASS.

## 3. Aktualna prawda repo — nie scalać przez rozpęd

| Miejsce | Stan | Funkcja |
| --- | --- | --- |
| `main` | stary grywalny K2 | zabezpieczony punkt odniesienia |
| draft PR #2 `research/spatial-truth-2026-10-19` | research od starego K2 | dowody wskazywania i dawstwa; nie nowa baza |
| draft PR #3 `rebuild/spatial-world-foundation-2026-10-19` | gałąź od main | nowy grywalny XYZ |
| draft PR #4 `research/box3d-donor-live-parity-2026-10-20` | gałąź od PR #3 | Box3D, Rapier A/B, realna lokalna sesja, odwracalne opcje |
| draft PR #5 `research/material-part-lifecycle-2026-10-20` | gałąź od PR #4 | **obecny eksperyment materialnych brył oraz naprawiona infrastruktura buildu/testów** |

To **łańcuch zależnych eksperymentów**, a nie pięć równorzędnych wersji gry. Nie zamykać, nie scalać ani nie przestawiać baz bez potwierdzonej regresji i jawnego awansu jednego stanu. Nie dodawać PR #6 tylko dlatego, że rodzi się nowy pomysł.

## 4. Dziś domknięta jakość stanowiska
- `build-next.py`: jedno źródło samodzielnego HTML, `--check` wykrywa rozbieżność bez nadpisywania. Odrzucono ręczne sklejanie modułów.
- `tests/verify-next.sh`: jedna automatyczna bramka deterministycznego buildu, parsowania bundla i testów nowego kodu. Historyczne pozytywne K2 i znane czerwone `tests/research/causal-pressure.test.mjs` pozostają jawnie odrębne. To nie jest wyciszenie czerwonych prób; ich celem jest wskazanie wady starego solvera.
- `.github/workflows/splot-next-research.yml`: GitHub Actions, minimalne uprawnienia read-only, scoped branch/path, bez deploymentu. **Workflow z 20.10.2026 zakończony success:** https://github.com/Jozzpoly/Splot/actions/runs/39363142120 .
- `AGENTS.md` ma zasadę niepowielania roboczych PR, jasnych poziomów dowodu, szacunku dla aktywnego testowania Ownera, niepublikowania prywatnych logów i oceny całej gry.
- **Brak zatwierdzenia WebGL/Box3D na fizycznym telefonie** i brak dowodu, że nowa interakcja `Kotwica` przeszła kontrolę w realnym runtime. CI to poziom statyczny/Node, nie gameplay acceptance.

## 5. Krytyczne ryzyka i antycele
1. Wpisany w `spatial-core.mjs` limit **256 authored elements**. Sam stan `anchored/dynamic` nie zapewnia „chorej liczby obiektów”. `sceneTriangles` odtwarza geometrię, a `app.mjs` robi `scene.elements.find` przy każdym trójkącie — potencjalny koszt ~O(N²). Brak pomiaru na 1k/10k obiektów, brak indeksu przestrzennego i planu LOD.
2. Ruch Box3D Donora i fizyka świata są obecnie dwoma częściowo niezależnymi kontraktami. Aby aktor stał na ruchomej bryle bez kłamstwa, wymagany jest rzeczywisty moving support i sprawdzony transfer impulsu/pozycji. Nie deklarować pełnego „jeden świat” tylko dlatego, że współdzielą jedną tablicę `elements`.
3. `box` = AABB, a dynamiczne Box3D potrafi 6DoF. Rotacja celowo zablokowana. Bez canonical rigid transform i lokalnego kształtu nie zbudujemy wiarygodnego przechyłu, przewracania, belek i złączy. Nie budować całego rozwiązania na mutable `min/max`.
4. Dzik, jego alternatywne AI i impulse R&D nie są produktową akceptacją; nie rozbudowywać lokalnych wyjątków zamiast fundamentu.
5. Obraz/kolor/materiały/ruch nadal dramatycznie odstają od celu. Silnik fizyczny nie załatwi czytelności, piękna i przyjemności w spontanicznym odkrywaniu świata.
6. `playtest-journal.mjs` to wyłącznie dobrowolna lokalna sesja w karcie, bez serwera i bez automatycznej percepcji agenta. Opera nową kartą może kraść focus; preferować czytanie pasywne i headless. Brak inputu ≠ dostępność Ownera.

## 6. Jutro — jedna kampania z realną bramką
**Cel:** zbudować w istniejącym Splot Next jedną autorską bryłę wysoko nad podłogą, zwolnić ją, zaobserwować realny upadek/kontakt, zakotwiczyć w nowym miejscu, wejść w interakcję ze skrzynią/graczem i sprawdzić, czy świat nadal działa. Przed kolejną nową funkcją sprawdzić:
- `bash tests/verify-next.sh` — automatyczny, powtarzalny, dziś uruchomiony na CI, ale sprawdzić najnowszy commit.
- rzeczywisty WASM `?physics=box3d&probe=material` **w izolowanym/headless browserze bez przerywania Ownera**, wraz z tekstem PASS/FAIL, logami runtime i screenshotem; nie zastępować tego mockiem;
- swobodną próbę kilku minut w jednej grywalnej scenie, obserwując picking, render, półprzezroczystości/okluzję, ruch i realny kontakt; osobno emulacja mobile, potem realne urządzenie.
- dopiero jeśli to działa i jest przyjemne: decyzja, czy uproszczony `anchored/dynamic` to użyteczny donor, czy trzeba podważyć sam canonical spatial model.

**Jeśli ten test nie działa — żadnej dalszej rozbudowy fizyki konstrukcji.** Rozwiązać przyczynę na właściwym poziomie albo jawnie odrzucić donor. Jeśli działa, kolejnym kandydatem jest pełna transformacja/obrót i konsekwencje supports, z jednolitym miejscem prawdy; nie wszystko od razu.

**Nie robić rano:** tworzenia kolejnego PR z pojedynczym parametrem; kolejnego „PASS” opartego tylko na mocku; podnoszenia limitu 256 bez benchmarku; zastępowania wypracowanego chwytu i działania gry „czystszą” geometrią; projektu integracyjnego Jaskinia/Medium/Feniks przed użytecznym lokalnym vertical slice.

## 7. Źródła do dalszego odczytu (na żądanie, nie całość naraz)
- PR #3 / #4 / #5 na GitHub oraz zwięzłe opisy ich zakresów.
- `docs/research/2026-10-20-box3d-donor-live-parity.md`
- `docs/research/2026-10-20-owner-freeplay-contact-and-session.md`
- `docs/research/2026-10-20-actor-contact-and-observer-gate.md`
- `docs/research/2026-10-20-real-owner-session-and-boar-intent.md`
- `docs/research/2026-10-20-material-part-lifecycle.md`
- `AGENTS.md` oraz `tests/verify-next.sh`.
- Dane/wideo prywatne są załącznikami do rozmów Ownera, **nie są w repozytorium**.

**Checkpoint:** ponownie odzyskać pytanie „czy gracz może dotknąć, zbudować, zobaczyć i zmienić konsekwencję w żywym świecie”, a nie „ile nowych testów udało się napisać”.
