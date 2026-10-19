# Splot — żywe rampy i podesty, checkpoint badawczy

**Status:** research candidate based on playable K2/PR #2, not Owner-approved release. Do not merge into `main` just because geometry tests are green.

## Po co

Próba przeciw regresji K3. Nowa konstrukcja musi istnieć w tej samej dużej mapie co dzik, gracz, skrzynie, chwyt, edytor i zapis. Musi być możliwa do stworzenia w kolejnym, nieprzygotowanym miejscu, bez per-scenariuszowych definicji kolizji i promieni.

## Co działa (zakres testów)

- **Nowa operacja autorska** `placeScaffold(w,x,y,{turns,height})`: atomowo stawia *dwie oddzielnie adresowalne konstrukcje* — dojście (rampa) i płaski podest — z istniejącego prymitywu `makeSlopedPlank`. Rotacja 0/90/180/270°, wysokość 0.9–3.0 m w API, na ekranie trzy wartości w panelu. Stałe: długość, szerokość, grubość. Konstrukcje są **statycznymi mocowaniami edytora**, nie przedmiotami z masą/nośnością.
- **Dwie różne konstrukcje** w scenariuszu „Warsztat wysokości” zostały utworzone przez tę samą publiczną operację; trzecią można dodać w dowolnym dostępnym miejscu narzędziem `Konstrukcja (6)` i obrócić `T`/przyciskiem. `R` nadal resetuje scenę.
- **Jedna geometria** nowych ramp/podestów steruje `surfaces`, kolizją ciał (aproksymowany pionowy cylinder), promieniem (`plankRayHits`), rysowaniem z tych samych trójkątów, wybieraniem narysowanej konstrukcji przez promień zgodny z projekcją ekranu i zapisem. Nawigacja dzika widzi konstrukcje poprzez istniejące konflikty ciała, ale nie otrzymała wielopoziomowej nawigacji.
- **Manipulacja w tej samej grze**: test pozytywny pchania i przeciągania skrzyni przez rampę na podest oraz wypchnięcia jej za krawędź w stan spadania. Inne scenariusze K2, główna kamera, joystick, dwuręczny chwyt, zapis/import i stara mapa nie zostały zastąpione demonstratorem.
- **Atomowość:** niedopuszczalne miejsce lub kolizja nie dodaje ani rampy, ani podestu. Nieudany i niepoprawny snapshot nie niszczy aktualnego świata. Usunięcie podestu powoduje lokalną utratę podpory i opadanie aktora.

## Co testy próbowały obalić

- Pierwszy test ruchu **FAIL**: człowiek stawał przed nowym podestem na końcu rampy (konflikt cienkiej bryły i dopuszczalnego stopnia). Dodano wąską regułę kontaktu dla już podpartego ciała i niskiego stopnia; nie została uznana za pełny solver.
- Pierwsza próba renderera: widoczny przekątny szew wewnętrzny i rampa zasłaniająca głowę człowieka *przed* nią. Później rysowanie pełnych powierzchni z trójkątów i prosty painter uwzględniający także odległość w XY. To **przybliżenie**, nie poprawny bufor głębi.
- Próby nielegalnej geometrii **RED→GREEN**: zbyt odległe współrzędne w JSON, przecinanie historycznej rampy przez nową konstrukcję oraz import przecinający istniejący mur. Autorowane bryły przechodzą kontrolę obrysu i obszaru zajętego.
- GUI: faktyczne kliknięcia i tapnięcia do stworzenia trzeciej konstrukcji, dwa z trzech widoków pozwalają też usunąć zaznaczony podest; w poziomym wąskim kadrze cel do usunięcia nie mieścił się na ekranie i **nie sprawdzono** tej operacji.
- Zachowany skrót `R` (reset), nowy skrót `T` (obrót). Import przebadany przez formularz `input[type=file]`, nie tylko `restore()`.

## Weryfikacja i jej granice

- `node --test tests/*.test.mjs`: 100 testów, **99 PASS, 1 TODO, 0 FAIL** po dodaniu nowej kampanii.
- `bash tests/verify.sh` obejmuje pełne starsze stress/chaos, scenariusze Chromium i mobile oraz nowy browser scaffold. Podczas tego runu polecenie zostało **przerwane limitem po ukończeniu starszych etapów**, przed zebraniem wyników nowego testu UI. `python tests/browser_scaffold.py` uruchomiony następnie osobno: desktop/pion/poziom stworzenie, import PASS; usuwanie PASS na desktop i pion, **niebadane w poziomie**.
- Historyczne mobilne testy dwupalcowego ruchu + chwytu w Chromium przeszły na emulowanych 320×568, 393×852, 844×390; testu na fizycznym telefonie Ownera **brak**.
- Lokalnie sprawdzono brak błędów JS w nowych scenach oraz porównanie niezmienionej ścieżki starego K2 w dedykowanych testach regresji. Żadne testy automatyczne nie potwierdzają przyjemności gry ani decyzji o docelowym rendererze.
- Kod jest samodzielny w `index.html` i modułowy w `src/`. Zbudować: `python3 build.py`; testy: `node --test tests/*.test.mjs`, `python tests/browser_scaffold.py`.

## Krytyczne otwarte granice

1. **Brak ogólnego modelu nośności.** Jeśli usuniesz rampę, połączony statyczny podest może pozostać zawieszony. To świadome TODO, nie działająca fizyka połączeń.
2. **Przybliżone wykrywanie schodzenia/wchodzenia.** Okrąg stóp + pionowy cylinder, bez obrotu, momentów i prawdziwej dynamiki. Nie zastępuje solvera.
3. **Renderer nadal przybliżony.** Painter XY+Z może przekłamywać nakładające się powierzchnie; lokalny cutaway nie rozwiązuje głębi. Nie ma wielowarstwowej selekcji każdej powierzchni i bryły, tylko promień trafień autorowanych płyt.
4. **Autorstwo presetowe.** Można zmieniać miejsce, kierunek i wysokość zestawu rampa+podest; na ekranie nie ma jeszcze edycji punktów, szerokości, kształtu ani połączeń. Studio nie powinno przyjmować tego jako swojego modelu danych.
5. **Nawigacja dzika nadal wszechwiedząca i dwuwymiarowa**, nie chodzi po wielowysokościowych podporach. Konstrukcje wpływają na okupowaną przestrzeń, ale nie tworzą semantycznej sieci tras między wysokościami.
6. **Wizualna pustka**: dwie próby są płytami technicznymi, nie autorskimi budowlami z materiałem, szczegółem i konstrukcyjnymi złączami. Nie rozwiązuje to Owner FAIL dotyczącego drewnianości / braku charakteru.
7. **Koszt wielu brył:** brak jeszcze niezależnego pomiaru na fizycznym smartfonie przy maksymalnej liczbie konstrukcji.

## Próba dla Opusa i Astry (bez obowiązku integracji)

Użyj *tylko* wąskiego kontraktu `makeSlopedPlank` i wyników `surfaces/geometry/ray` jako możliwego donora. Sprawdź na osobnym, edytowanym przez autora dokumencie **zmianę kąta, szerokości i wysokości**, zachowanie tożsamości dwóch wariantów i powrót do projektu. Splot posiada wykonanie, Studio ma pozostać właścicielem decyzji autorskich. `snapshot(forge-v1)` jest zapisem żywego świata, **nie** formatem autorskiej pracy Studia.

## Następny eksperyment do falsyfikacji

Nadal w żywym Splotcie, bez nowego K4: (1) edycja pojedynczej części już postawionej konstrukcji bez jej ponownego tworzenia; (2) sensowne zachowanie przedmiotów i postaci po przeniesieniu podpory; (3) wybór poziomu i czytelny przekrój tam, gdzie nakładają się dwie płyty; (4) konfrontacja uproszczonej kinematyki z gotowym rigid-body/constraint solverem na **tych samych czynnościach**. Dopiero po próbie Ownera rozstrzygać, co awansuje do gry.
