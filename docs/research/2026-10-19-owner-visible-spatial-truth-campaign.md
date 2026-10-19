# Splot — kampania „Przestrzeń, której można zaufać”
**Plan i pierwsze evidence: 19 października 2026.** Status: badania, nie nowa wersja gry i nie decyzja o silniku. Owner FAIL dotyczące mobile, czytelności 2.5D i bezpośredniej interakcji pozostają otwarte.

## 0. Decyzja po weryfikacji kodu
Nie kontynuować dzisiaj mechanicznie nieopublikowanej nawigacji dzika. Planer między wysokościami to osobny wartościowy front, ale jego późny kod nie jest w repo. Większą niepewnością produktową jest teraz to, czy gracz umie rozpoznać **na czym stoi, co zasłania jego postać, na którą powierzchnię klika oraz dokąd przesunie lub zrzuci przedmiot**. K3 pokazał, że same lepsze geometrie bez gry są stratą.

### Potwierdzone źródło bieżącej kampanii
- Grywalny K2 i budowalne konstrukcje są w research PR #2; \`main\` zostaje niezmieniony do Owner review.
- \`src/app.js\`: projekcja \`screenY=base+scale*(0.67*(y-camY)-0.53*z)\`, \`drawScene\` sortuje **całe** konstrukcje i ciała z heurystyką \`z+h+0.57*y\`.
- \`src/app.js\`: \`pointerdown\` oblicza poziom większości operacji z \`selected.support\`, a \`erase\` części nowych konstrukcji używa specjalnego \`pickConstructionAtProjection\`.
- \`src/world.mjs\`: \`pickConstructionAtProjection\` sprawdza **tylko authored planks** i top hits; nie jest ogólnym pickingiem gruntu, historycznego mostu, ciał i wszystkich powierzchni.
- Dotychczasowe \`viewMode=cut\` i \`auto\` są pomocami oglądania, nie pełną okluzją; przełączenie nie powinno zmieniać snapshotu.

## 1. Pierwszy adversarial baseline — WYKONANY (nie poprawiona własność)
Uruchomiono niemodyfikowany produktowy \`app.js\` odpowiadający Git blob \`a997b72792f65496e3501e62d868e0574a7474c4\` w Chromium, \`Przęsło\` zatrzymane, ekran 1280×800, identyczny wskazany punkt widocznego mostu. Przy aktywnym narzędziu \`Skrzynia\`:
- \`selected=player\`: utworzona skrzynia (x≈45.0, y≈26.4433, z=0), \`support=ground\`.
- \`selected=scout\`: utworzona skrzynia (x≈45.0, y≈28.5, z=2.6), \`support=bridge\`.
- Oba działania zaakceptowane, bez JS error, punkt kursora odchylony mniej niż ~0.03 CSS px po stabilizacji kamery.

Wniosek: kliknięcie w pozornie tę samą powierzchnię **nie determinuje** autorskiego celu operacji. Sterowana postać wybiera ukrytą warstwę; to może być wygodny default, ale nie wystarczy jako system autorstwa. Ten skrypt jest **reprodukcją niespójności UX, a nie pozytywnym testem ukończonej funkcji**. Nie dodawać go jako zielonej bramki jakości. Uruchomienie: \`python tools/repro_screen_pick_ambiguity.py\`.

## 2. Rzeczywista sytuacja Ownera, nie geometryczne demo
Scena porównawcza w **normalnym Splotcie**:
- aktor na gruncie pod mostem i aktor na górze, w rzutowaniu częściowo nałożeni;
- gracz chwyta skrzynię, ciągnie ją rampą, wypycha z podestu i obserwuje spadanie;
- tworzy trzecią konstrukcję i usuwa wskazany element, bez resetu całego świata;
- na ekranie są widoczne dwa poziomy oraz co najmniej jedna powierzchnia zasłaniająca cel;
- próby: desktop; telefon pion 393×852 i wąski 320×568; poziom 844×390; kontrola wielodotyku.
Ten sam zapis/seed i ta sama dynamika służą porównaniu wariantów wizualnych. Nie wymuszać idealnie identycznej trajektorii przy innym input — porównywać tę samą intencję i obserwowalne konsekwencje.

### Rozdzielone instrumenty
1. **Prawda świata:** XYZ, support, ray, ciało, obrys przedmiotu, ważne zdarzenia.
2. **Widoczność:** które fragmenty brył fizycznie zasłaniają inne dla danego oka.
3. **Prezentacja:** shadow, forma, kontrast wysokości, wybrana konwencja cutaway.
4. **Autorstwo:** multi-hit surface picking, wybrana warstwa / obiekt i wynik operacji.
5. **Wejście:** dotyk, chwyt i ruch jednocześnie. UI nie może przejmować gestów ani zasłaniać sceny.
Sukces jednej warstwy nie zalicza pozostałych.

## 3. Run I — odkłamać selection/picking
Najpierw testy RED na **rzeczywistym interfejsie**, potem najmniejsza zmiana:
- ten sam punkt obrazu daje jawnie dostępnych kandydatów: ziemia / pomost / wskazana bryła (gdy promień faktycznie je trafia); kolejność zgodna z projekcją, nie z \`selected.support\`;
- gest wyboru poziomu (cykl lub proste UI) jednoznacznie pokazuje aktualną powierzchnię i pozwala dotrzeć do niższej, mimo górnej przeszkody;
- \`place\` i \`erase\` używają **tego samego jawnego wyboru**, nie dwóch konkurencyjnych odwzorowań;
- niezmienione: stan fizyczny przy samej zmianie selekcji, obie dostępne warstwy, działania 1- i 2-palcowe;
- niemożliwe działania nie zmieniają snapshotu. Należy odróżnić \`no hit\` od \`hit but illegal placement\`.
*Stop-rule:* jeśli trzeba udawać wybór poziomu przez zmianę z aktora na aktora, model nie przeszedł.

## 4. Run II — prawdziwe zasłanianie kontra świadomy przekrój
Najpierw odtworzyć sceny, gdzie obecny painter wprowadza w błąd, bez zmiany fizyki. Porównać **w tej samej grywalnej scenie**:
- A: obecny painter (kontrola), per-face sort i/lub celowe maski dla typowych brył jako tani kandydat;
- B: rzeczywista próba depth-aware renderingu ortograficznego/ograniczonego XYZ, jeśli A nie rozwiązuje przeplatania sylwetek i powierzchni;
- C: świadomy authored/cutaway sposób oglądania, jawnie osobny od fizycznego zasłaniania.

Nie zakładać z góry WebGL, Three.js ani końcowego wyglądu. Każdy kandydat rozstrzyga: aktor przed rampą, pod rampą i nad nią; dwa aktory dzielące projekcję; skrzynia za krawędzią; widok na 320px; kontrola selected bez fałszywego wyskoku materiałów. Przekrój może świadomie ujawnić ukrytą rzecz, ale musi być **oznaczony jako pomoc widoku**. Renderer ma pokazać **tę samą** prawdę świata co picking, nie wybierać innej.

*Stop-rule:* jednorazowy ładny screenshot nie wystarczy. Ruch i dwie warstwy w różnych miejscach mapy muszą zachowywać się konsekwentnie. Jeśli per-face painter nadal przeplata niewłaściwe fragmenty, nie łatać każdego mostu osobną regułą.

## 5. Run III — obraz, materia, bezpośrednia przyjemność manipulacji
Na tej samej scenie porównać 2–3 świadomie zaprojektowane warianty czytelności i materiału: ciemny masywny podest / lekka ażurowa kładka / kontrast terenu, zgodnie z artystyczną kontrolą Ownera. Każdy wariant powinien wspierać rozpoznanie: krawędź, cień, co jest pod spodem, gdzie aktor stawia stopę, gdzie ląduje skrzynia. Nie wprowadzać globalnego \`wood=true\`, proceduralnej pstrokacizny ani nowego „asset engine”.

Równolegle testować gest: trzymanie analoga, zwrot, działanie drugą ręką, puszczenie dotyku, przejście pod/na, edycję konstrukcji. Interfejs usuwa niepotrzebne obciążenie uwagi, zamiast dokładania stałych napisów. Dwie niezależne próby: **czy rozumiem świat? czy chce mi się nim bawić?** Brak tej drugiej oznacza brak awansu mimo technicznego sukcesu.

## 6. Run IV — całościowe bramki i decyzja
- Przed/po: różne seed, stare scenariusze (chwyt, zrzut, zagroda, skrót dzika, przęsło, warsztat), zapis/import, pełny desktop i mobile.
- Obrazy desktop/portrait/landscape oraz klip sekwencji rzeczywistych działań. Unikać kruchych absolutnych diffów pikseli: kontrola szumu screenshot-same-vs-same oraz semantyczne asercje obrazu i zachowania.
- Raportować osobno PASS kodu, PASS UI w Chromium, Owner PASS/FAIL z telefonu i nierozwiązane kontrprzykłady.
- Każda usunięta istniejąca możliwość wymaga jawnego uzasadnienia i korzystniejszego zamiennika, a nie domyślnego wycięcia.
- Względem prac Feniksa, Studia i Jaskini: tylko wąskie dawstwo \`geometry/surface/pick\`, nie wspólny runtime, schemat gry, kamera ani rzekomo gotowy edytor 2.5D.
- Zmiany techniczne wyłącznie na obecnym draft PR #2 lub izolowanym krótkim branchu, **nie** na \`main\`, aż Owner realnie oceni nową grę. Nie publikować prywatnych nagrań i zapisów.

### Twarde kryterium awansu
W tej samej, żywej grze gracz może rozpoznać i jawnie wybrać obie warstwy, manipulować skrzynią i konstrukcją, zobaczyć spójne następstwa fizyczne i odczytać przestrzeń na telefonie bez walki z UI. Testy automatyczne to dowody kontraktów, nie werdykt grywalności. **Owner FAIL ma veto.**

## 7. Osobny tor — wczorajszy nieopublikowany surface-nav
Nie przepisywać ze wspomnień w pierwszym runie. Zachować fakt: w rozmowie były raporty porcjowanego A*, zejścia i wejścia po dwóch rampach, reakcji na przebudowę, budżetu i walidacji importu, lecz GitHub nie ma tych źródeł. Odzyskanie lub uczciwa odbudowa ma ruszyć **po** ustabilizowaniu sceny czytelności; jej testy wykorzystają wspólny prawdziwy świat i body-specific traversability, nie wyidealizowany XY-only graf. Nie uznać wyszukiwania ukończonym, jeżeli planowanie zaczyna zacinać telefon.
