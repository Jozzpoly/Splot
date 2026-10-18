# Splot / korekta po Owner FAIL mobilki (18.10.2026)

## 1. Dowód, nie deklaracja

Owner zgłosił: „Na mobilce jest źle, ui jest źle, tekst zasłania. Przyciski to katorga i tortury, zaznacza tekst zamiast chodzić. Podstawy wymiękają.” Jest to **FAIL doświadczenia** nawet przy wcześniejszym PASS technologii. Nie wolno reinterpretować tej wypowiedzi jako prośby o poprawienie wyłącznie kolorów.

### Zmierzone stare zachowanie

- 375×720 (DPR2): `documentElement.scrollHeight=1938`, podczas gdy viewport ma 720; poza płótnem istnieje dalszy wielki panel.
- Stara dolna belka HUD nachodziła na część fizycznych przycisków. D-pad miał 48px w pionie, 40px w poziomie; pomoc opisowa dominowała nad sceną.
- `.stage` nie zabraniało zaznaczenia tekstu, a narzędzia autora i kierunki ruchu konkurowały o przestrzeń.
- Wcześniejsze testy miały zielone asercje stanu świata po wstrzyknięciu naciśnięcia przycisku. Nie sprawdzały ciągłego gestu ani wielodotyku i nie chroniły jakości obsługi.

## 2. Hipoteza, zmiana i weryfikacja

Hipoteza: pękł **kontrakt wejścia gry na dotykowym urządzeniu**, a nie pętla ruchu samego kernela. Zmiana ograniczona do `src/index.html`, `src/app.js` i testów UI. Nie wymieniano mapy ani kernela.

- Mobilny viewport to jedna scena pełnoekranowa (brak dodatkowego panelu pod ekranem). Panel scenariuszy/diagnostyki otwiera się jawnie, nie zabiera stale miejsca.
- Analogowy joystick rejestruje `pointerdown/pointermove/pointerup/pointercancel/lostpointercapture`, ma strefę martwą i natychmiastowe zwolnienie; przy otwarciu menu oraz utracie focusa resetuje kierunek.
- Występują dwa duże przyciski akcji, niezależne od joysticka; scena i sterowanie nie generują selekcji tekstu ani systemowego menu kontekstowego przy długim przytrzymaniu.
- Krótkie komunikaty są tymczasowe i nie blokują sterowania. Stały blok skrótów klawiaturowych jest ukryty na telefonie.
- W scenie nadal istnieją K2: chwyt, zrzut, zwierzę, mury, zapisy i warianty, a nie K3 jako nowy ekran.

Testy: `tests/mobile_owner_contract.py` (rzeczywista sekwencja jednego i dwóch dotknięć, edycja, długi press, brak selekcji i scrollowania), `tests/mobile_rotation.py` (zmiana orientacji bez utraty snapshotu), `tests/browser_gameplay.py` (ruch i chwyt, spadanie, edycja i import), `tests/browser_view.py` (zmiana widoku bez mutacji), `tests/browser_depth.py` (dwa poziomy). Dla kodu fizyki: 72 pozytywne testy Node, stres 18 000 ticków i chaos autora.

**Brak dowodu**: czy prawdziwe urządzenie Ownera ma przyjemny feel, czy System Android/Opera/Chrome zachowuje gesty tak samo, czy joystick ma właściwy rozmiar dla jego dłoni oraz czy FPS jest wystarczający. Nawet wszystkie testy Chromium PASS nie zmieniają Owner FAIL bez jego własnej ponownej próby.

## 3. 2.5D: ograniczona zmiana, otwarta architektura

W `viewMode=auto` zamiast globalnej przezroczystości mostu zastosowano lokalny, półprzezroczysty przekrój wokół wybranej postaci *pod* konstrukcją. `cut` pozostaje globalnym narzędziem diagnostycznym, a `solid` pełną bryłą. Wszystkie trzy tryby nie zmieniają `snapshot(w)`.

To **nie** dodaje Z-buffer ani prawdziwego rasteryzowania ukrytych powierzchni. Aktualny painter's order, wybór powierzchni przez położenie wybranej postaci, jedna wpisana rampa i pomost, fizyka cylindra i uproszczony chwyt to otwarty dług. Nie wolno nazywać tego rozwiązaną geometrią lub renderem 2.5D.

### Co przenieść z K3, czego nie przenosić

- **Badawczo przydatne:** idea `makeConstruction` -> spójne `shapes`, `trianglesOf` i `rayHits`; orientowane konstrukcje i kontrprzykład drugiego podestu. Możliwy zalążek konfrontacji semantycznego 2.5D i ograniczonego XYZ.
- **Nie przyjmować do gry:** K3 `app.js`, kontrolek, pustej testowej sceny, słupkowych ciał i osobnej kinematyki. To była regresja całego doświadczenia potwierdzona przez Ownera.
- **Warunek integracji:** aktualny grywalny Splot zachowuje swobodną manipulację, dzika, kadr, zapis i sterowanie; ogólne konstrukcje muszą działać przy tym samym interaktywnym loopie. Przygotować test z drugim mostem, obracanym podestem i wyborem powierzchni, bez ręcznego forka UI.

## 4. Werdykt

- **PASS techniczny w ograniczonych próbach:** brak przewijania mobile; joystick porusza ciałem; druga ręka korzysta z chwytu; brak selekcji; edycja i zapis nie znikły; widoki nie mutują świata.
- **NIEUDOWODNIONE:** dobry mobilny feel, jakościowa przestrzenna czytelność, generalizacja 2.5D, pełna kolizja i art direction.
- **Następny Owner test:** mobilne 1–2 minuty w scenie „Chwyt” i „Zrzut z mostu”, przejście pomiędzy nimi przez Menu oraz zmiana widoku. Bez oczekiwania na „PASS” z uprzejmości — nagrać/lokalnie opisać rzeczywisty problem, jeśli nadal wystąpi.

### Dodatkowa próba falsyfikacyjna: drugi palec

Pierwsza wersja nowego testu sprawdzała ruch przy dwóch dotknięciach, ale **nie sprawdzała przemieszczenia skrzyni**. Po dodaniu tej asercji test przeszedł na czerwono: postać szła ~0,74 m, a skrzynia nie ruszała się ani o centymetr. Zarejestrowany status nie zawierał zdarzenia `grip`.

Przyczyna: w sekwencji dwóch jednoczesnych dotknięć Chromium nie syntetyzował zdarzenia `click` na drugim przycisku po puszczeniu drugiego palca. Interfejs przekazywał akcje tylko z `click`. Zmieniono mobilne przyciski akcji na wyzwalanie przez `pointerdown` (touch/pen), z ochroną przed podwójnym syntetycznym `click`. Po zmianie testy na 320×568, 393×852 oraz 844×390 sprawdzają zarówno ruch człowieka (~0,635 m), jak i rzeczywisty ruch **chwytanej skrzyni (~0,210 m)** przy dwóch palcach. To jest odtwarzalny dowód zachowania w emulacji, nie zapewnienie o ergonomii telefonu Ownera.
