# Splot — Owner FAIL po screen-pickingu: audyt strukturalny i falsyfikacja renderera

**19.10.2026 · status: badanie i odrzucenie przedwczesnych rozwiązań; nie nowe wydanie gry.**

## Cel, a nie ostatni impuls
Owner: „Nadal strukturalnie bardzo źle, nadal mało się zmieniło”. Wcześniej krytykował K3 za utratę życia, manipulacji i obrazu oraz mobilne UI za zasłanianie gry i niewygodne sterowanie. Odkryta później iskierka 2.5D nie była akceptacją gameplayu ani technologii. Zadaniem nie jest już jedynie zrobić poprawny picking lub poprawić liczbę testów. Trzeba zapewnić w żywym, stale grywalnym Splotcie **spójność działania, geometrii, widzenia, wyglądu, materiałowej konstrukcji i sterowania**, bez kasowania uzyskanej sprawczości.

## 1. Co pokazuje dostarczony film, a czego nie
Plik prywatny 11,8 s, 942×688, 30 fps. Na przekroju czasu widać postać prowadzoną z poziomu gruntu do rampy, dochodzenie do połączenia z dużym, drewnianym mostem/pomostem, drugą postać u góry i przesuwający się kadr. Widać jednocześnie płaski, szachownicowy grunt, obszerną, prawie jednolitą płytę zasłaniającą środek sceny oraz drobne sylwetki o małej czytelności relacji wysokości. **Ocena Ownera ma pierwszeństwo przed tym, co wygląda poprawnie na wybranej klatce.**

Nie ma w tym 11,8-sekundowym klipie wystarczającego dowodu do oceny: chwytu, zrzucania skrzyni, eksportu, wielodotyku, wydajności fizycznego telefonu, autonomii dzika ani skuteczności edytora. Nie przypisujmy nagraniu tego, czego nie pokazuje. Nie przekazywać pliku ani klatek do publicznego GitHuba.

## 2. Dlaczego praca nad pickerem nie zmieniła prawie nic
- `src/world.mjs` posiada już powierzchnie z `z`, częściowy `raycast` w XYZ i picker. **To źródło punktów autorstwa**, nie renderer ani semantyczny opis konstrukcji.
- `src/app.js`: `XY(x,y,z)` rzutuje świat do 2D, lecz traci jedną współrzędną. Pojedynczy piksel może odpowiadać wielu wysokościom.
- `drawScene()` sortuje **całe** postacie i płyty jedną heurystyką `z + h + 0.57*y`. Rzeczywista relacja ukrycia zmienia się wzdłuż powierzchni i **wewnątrz sylwetki jednej postaci**. Same zmiany kolejności rysowania nie wystarczą.
- `actor()` tworzy całe płaskie rysunki, niezależne od 3D kształtu walca używanego w `bodyConflicts` i od raycastu.
- `bridge()` jest starszą, wyspecjalizowaną ścieżką malowania; `drawConstruction()` jest osobną dla nowych planków. Selekcja i fizyka mają własne rozgałęzienia historyczne. Coraz bardziej widoczny jest rozjazd między jedną prawdą świata a wieloma częściowo niezależnymi prezentacjami.
- `viewMode=auto/cut/solid` ujawnia część materiału według aktywnego aktora. To pomoc wizualna, nie obliczenie widoczności.
- W scenie „Warsztat wysokości” kamera w badanym kadrze ucina część obiektu: algorytm testuje konstrukcję, ale obraz nie pokazuje jej jako zrozumiałej całości. Na telefonie zakres obrazu jest jeszcze ciaśniejszy.

### Sprawdzian bez poetyki: fizycznie możliwa postać, częściowe zasłonięcie
Na dokładnej geometrii oryginalnego Splotu (z bezpośrednim `placeScaffold`, bez nowej gry) ustawiono próbną postać na ziemi w `x=18.55,y=14.55,z=0`, o promieniu 0,30 i wysokości 1,64. `bodyConflicts` nie wykrywa przenikania. Promień z tego samego, zdefiniowanego punktu obserwacji **trafia w podest w drodze do stóp**, ale **nie trafia przeszkody w drodze do głowy**. Analogiczny, fizycznie dopuszczalny przypadek na rampie obróconej występuje przy `x=16.3,y=12.3,z=0`. Test: `tests/renderer_pressure.test.mjs`.

Obecny rysunek postaci występuje jako jedna niepodzielna operacja. Może więc prawidłowo rozstrzygnąć tylko część takich konfiguracji. To jest realny falsyfikator architektury malowania całych obiektów, a nie spór o gust estetyczny. **Poprawność geometrycznego raycastu nie oznacza poprawności obrazu.**

## 3. Jak odróżnić brak nośności od słabej widoczności podpór
**Historyczny most ma już cztery filary** w `solids(w)`. To nie jest brak danych. Są jednak rysowane w innym porządku niż górna powierzchnia i sylwetki; w kadrze ginie ich rola materialna.

Natomiast autorskie `made-platform-*` składają się z płaskiej płyty bez opisanych podpór. Opracowano małego lokalnego donora: deterministyczne cztery podpory kolizyjne na podest, wyprowadzone z jego `ax,ay,bx,by,width,z1,thickness`; identyfikatory stabilne względem snapshotu. Są to rzeczywiste bryły: `solids`, `raycast`, `bodyConflicts`, walidacja miejsca stawiania, usunięcie rodzica i import je rozpoznają. Żadne atrybuty prywatnego filmu nie zostały użyte do ich położenia.

**Red → green / status próby:** pięć nowych testów nośnych brył początkowo 5 FAIL, następnie PASS. Lokalna paczka z kandydatem: 112 PASS, 1 TODO, 0 FAIL, stres 18 000 ticków (90 000 kontroli, 0 zgłoszonych porażek), chaos edytora, browser gameplay, browser scaffold i mobilne gesty PASS w zakresie emulacji. Badany HTML zachował poprzedni Canvas i dotychczasowe funkcje.

**Ważniejsze niż PASS:** porównanie screenshotów było prawie nieodróżnialne. Automatyczne słupy NIE rozwiązały czytelności ani art direction. Nie ma też symulacji momentów, obciążeń, zniszczenia podpory, ugięcia, spadania statycznej płyty czy niezależnej edycji każdego filaru. Nie nazywać tego fizyką konstrukcyjną i nie ogłaszać nowej wersji Splotu. To donor geometrii do rozważenia, a nie obowiązkowy wzorzec budowania podestów.

## 4. Rywalizujące renderery — wynik uczciwego przeglądu

| Kandydat | Sprawdzona rzecz | Co go dyskwalifikuje dziś |
| --- | --- | --- |
| Dotychczasowy Canvas/painter | działa, daje kontakt i podstawową czytelność, kompatybilny z mobilnymi testami | cały obiekt i cały sprite otrzymują jedną kolejność; nie rozstrzyga częściowej widoczności |
| Canvas z trzema pasmami postaci, każde badane raycastem | lokalny prototyp na **tym samym grywalnym Splotcie**, test trzech wysokości | widoczne odcięcia sylwetek, jakość wizualna i wiarygodność niewystarczające; nie promować |
| Rzeczywisty z-buffer WebGL2 | lokalnie opracowano izolowany kandydat GPU, nie został wdrożony ani opublikowany jako gra | w dostępnych uruchomieniach Chromium `getContext('webgl2')` i `getContext('webgl')` zwróciły `null`, również przy próbie software rendering; brak weryfikowalnego wyglądu i wydajności |
| Per-face Canvas albo software occlusion | realny konkurent do wykonania | sam sort twarzy nie gwarantuje prawidłowej per-pixel głębi, software depth może zabić mobile FPS; wymaga testu |

Nie wolno wyciągnąć wniosku „WebGL gorszy” z faktu, że lokalna infrastruktura GPU jest niedostępna. Nie wolno też twierdzić, że wystarczy dorysować więcej filarów, skoro test porównawczy tego nie wykazał.

## 5. Co zmienia mój wybór na następną długą kampanię

1. **Nie kontynuować w ciemno Run II jako kosmetyki renderera.** Najpierw doprowadzić `render input → physical geometry → visibility/depth → cutaway → screen picking` do jawnego, testowalnego kontraktu. Oddzielić fizyczną widoczność od świadomej, oznaczonej pomocy gracza.
2. **Jedna gra jako kontrola:** bez wycinania ramp, chwytu, dzika, edytora, mobilnego sterowania i zapisu. Renderery można podmieniać w jednej sekwencji gry, nie tworząc pustego laboratorium zastępującego K2.
3. **Nie tylko geometria:** równocześnie opracować świadomą kompozycję kadru, kontrast materiałów, sylwetki i cienie wspierające odczyt wysokości. Nie narzucać artyście finalnego języka. Jednobarwna płaszczyzna nie stanie się żywym miejscem dzięki depth bufferowi.
4. **Weryfikacja jakości:** (a) ten sam podest, postać pod nim i na nim, fizycznie poprawna widoczność stóp/głowy; (b) skrzynia opadająca za krawędź; (c) edycja dwóch poziomów przez ten sam ekran; (d) podróż przez rampę i powrót; (e) portrait + landscape, w tym prawdziwy dwupalcowy chwyt; (f) 2–3 nieprzygotowane konstrukcje. Każda wersja wymaga zdjęć i krótkiej sekwencji ruchu **oraz** zachowania gameplayu.
5. **Gotowe solver/rendering candidates bez przedwczesnego wyboru:** Canvas per-face tylko, jeśli przejdzie occlusion oracle; WebGL depth tylko jeśli da się go naprawdę wykonać i nagrać; wariant constrained 3D nie musi być jedynym modelem przestrzeni, ale nie powinien być odrzucony teoretycznie.
6. **Dług dla świata:** brak niezależnych elementów nośnych, brak spójnego material/attachment systemu, `flat` A* dzika, actor-on-actor support i kinematyczny chwyt. Renderer może pomóc odkryć potrzebne prawdy, ale ich nie stworzy. Gameplay i jakość dotyku mają veto.
7. **Kontrolować architekturę projektu:** `main` jako grywalny baseline, istniejący draft PR badawczy. Nie kolekcjonować kolejnych niepowiązanych „K4”. Ten raport i test ciśnienia można wnieść do PR, ale nie wciskać do jego `src/` niezatwierdzonego draw mode / GPU.

## 6. Wyniki i klasyfikacja dowodów

- Źródło: aktualny opublikowany research Splot PR #2 (HEAD wcześniej `e3e9d157...`) skopiowane do izolowanego stanowiska; `main` nietknięty.
- **Do publicznego repo:** wykonywalne kontrprzykłady na autorskiej geometrii, raport bez prywatnych klatek. **Poza repo:** prywatny film, kontaktsheet, odrzucone screenshoty i opcjonalny donor słupów.
- **NIE wykazano:** poprawnego renderera końcowego, niezawodnej grywalności fizycznego telefonu, docelowej architektury 2D/2.5D/3D, sił nośnych czy znaczącej poprawy oprawy.
- **Owner FAIL jest nadal otwarty.** Dwie poprawne geometrie i 100+ testów nie zmieniają oceny obrazu.

**Werdykt:** najważniejsze dzisiaj nie było „dodałem cztery filary”. Otrzymaliśmy konkretny, fizycznie dopuszczalny przypadek, który wykazuje **niedostateczność obecnego modelu przedstawiania świata**. Dwa szybkie pomysły na jego obejście nie zasłużyły na awans. Następna przebudowa ma rozwiązać ten przypadek *w żywej grze*, jednocześnie lepiej pokazując przestrzeń, a nie dowieźć kolejny PASS bez widocznej wartości.