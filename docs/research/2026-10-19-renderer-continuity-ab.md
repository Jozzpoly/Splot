# Splot — ciągłość po końcu poprzedniej konwersacji: korekta dowodu i A/B Canvas
**19.10.2026. Research only. Nie jest to Owner-accepted build ani wybór docelowego renderera.**

## Powód kontynuacji
Owner ostatnio ocenił obraz i strukturę jako nadal bardzo złe; poprawy geometrii i 100+ testów nie przyniosły odpowiadającej im poprawy doświadczenia. Main pozostaje odrębnym, grywalnym baseline, wszystkie bieżące zmiany są w istniejącym draft PR #2. Nie wolno przedstawiać tej kampanii jako promocji do release.

## Korekta poprzedniej argumentacji — bardzo ważna
Wcześniejszy raport wywodził niemożliwość częściowego zasłaniania postaci z tego, że Canvas painter sortuje całe aktory i całe konstrukcje. To **było zbyt mocne twierdzenie**. Rysowana później pełna bryła może zakryć jedynie nakładający się ekranowo fragment narysowanego wcześniej sprite'a. Sam fakt, że raycast do stóp trafia w platformę, a do głowy nie, nie dowodzi więc, że uzyskany obraz jest błędny.

Pierwsze porównanie A/B w Operze w scenie stóp i głowy pokazało właśnie wizualnie bardzo podobne rezultaty. Wykonywalny test raycastu z poprzedniej kampanii jest wartościowym **oracle widoczności**, ale nie testem błędnego piksela. Hipoteza „konieczny natychmiast WebGL” nadal nie ma wystarczających dowodów.

### Ostrzejszy falsyfikator: płytki początek rampy
Dodano `tests/renderer_pressure.test.mjs` z pozycją gruntowej postaci przy płytkim wejściu na rampę (20,22.8,0), gdzie:
- świat powinien dopuścić fizyczny kontakt przy małej różnicy wysokości;
- promień kamery do punktu przy stopach może trafić w rampę, do głowy nie;
- zdefiniowany w kodzie painter (`z+h-.05+.57*y`) umieszcza całą postać **po** rampie (`max(z0,z1)+.57*mean(y)`) — zatem może namalować dolny fragment postaci tam, gdzie faktycznie zasłania go rampa.

To jest konkretna, odtwarzalna sprzeczność **porządku malowania z fizycznym oracle**, a nie jedynie argument z tego, że funkcja `actor()` wykonuje jeden draw-pass. Nowy test po dopisaniu **nie został jeszcze uruchomiony w pełnym środowisku**; wynik należy potwierdzić także pikselami przy identycznym stanie i kamerze, bo sampler sylwetki jest nadal billboardem, a nie modelem bryłowym.

## Konkurent w żywym Splotcie: geometryczne przycinanie sprite'a
Do aktualnego `src/app.js` dodano **odwracalny, domyślnie wyłączony** tryb „Widoczność A/B” (klawisz V lub przycisk w panelu); wymusza jedynie solid view na czas próby. Działa w normalnym świecie, z jego budowaniem, chwytaniem i aktorami, nie w nowym K3.

Zasada: dla obecnej ortograficznej kamery `screenY=.67*y-.53*z` bliższa na jednym promieniu część bryły ma większe światowe `y` niż billboard aktora. Każdy world triangle / box face jest docinany względem płaszczyzny billboardu i wycina odpowiadający fragment małej buforowanej tekstury postaci przy kompozycji Canvas. Nie trzeba robić osobnego raycastu dla każdego piksela. Trójkąty autorskich ramp pochodzą ze `constructionMeshes`, starej rampy z `rampTriangles`, przeszkody AABB z `solids`.

**Nie rozwiązano** całej okluzji: twarze brył nadal mają niepełny porządek między sobą; sprite nie ma rzeczywistej geometrii głębokości, obrys rysunku nie musi odpowiadać body cylinder; cutaway to osobna decyzja widoku. Brak pomiarów wydajności i jakości na fizycznym telefonie. Ta technika nie powinna awansować bez screenshotów i sekwencji ruchu.

## Rzeczywisty stan i bramki
- Naprawiono prawdziwy UI bug z Owner screenshot: komunikat przy tworzeniu dwóch konstrukcji używał `result.id`, ale `placeScaffold` zwraca `result.ids`; dodano asercję browserową na brak „undefined”.
- Oba samodzielne pliki HTML zostały przegenerowane ze źródeł. Próbna wersja została rzeczywiście załadowana w Operze z publicznego pliku brancha; widoczne były UI, scenariusz, świat i przełącznik badawczy. **To smoke UI, nie pełna weryfikacja A/B i nie Owner acceptance.**
- Dodano `tests/browser_visibility_compare.py` do porównania dwóch trybów, zapisania obrazów i sprawdzenia niezmienności snapshotu. **Nie uruchomiono go tutaj**. Poziomy portrait/landscape w Playwright to emulacja, nie realny telefon.
- Zastany test "head visible, feet occluded" pozostał, ale jego interpretacja została osłabiona. Dopiero sytuacja z poprawnie potwierdzoną kolejnością painter-vs-ray i raster proof uzasadnia techniczny werdykt.

## Otwarte kwestie, których nie przykrywa A/B
1. Struktura pozostaje płaska i diagnostyczna: ogromne bryły są mało materialne, podpory/materia/cienie/forma nie tworzą czytelnego sensu przestrzeni.
2. Model ciała i renderowane sprite'y są rozbieżne. Optyczne „ucięcie” nadal może wyglądać nienaturalnie nawet przy lepszym zasięgowo maskowaniu.
3. Przy platformie na 1.8 m z grubością .27 m prześwit ma 1.53 m, mniej niż wysokość człowieka 1.64 m. Model świata słusznie może blokować wejście pod nią; obraz powinien czytelnie pokazywać *dlaczego*. Wyższy wariant 2.2 m jest inną sytuacją.
4. Kamera `XY()`, target/picking i cutaway korzystają z kilku niezależnych decyzji; samo V nie scala ich w jeden kanoniczny system widoczności.
5. Symulacja dzika, structural supports i materialna zabawa nadal są otwartymi osobnymi frontami; nie dopisywać na razie nowej architektury w ich imieniu.

## Bramka kolejnego awansu
Najpierw uruchomić testy Node i Chromium, sprawdzić `probe=edge` (oraz ruch pod/obok górnej konstrukcji) z *tym samym* seed, actor position, solid mode i kamerą po stabilizacji. Mierzyć piksele, maski, oracle promienia, faktyczne przemieszczenie i koszty FPS. Jeśli nowy Canvas nie daje wyraźnej, powtarzalnej poprawy w przejrzystości lub w grze, pozostawić go badawczym kandydatem albo usunąć, a nie promować za samą elegancję matematyczną.

**Werdykt:** test falsyfikujący wcześniejszą zbyt mocną tezę jest ważniejszy niż kolejny render engine. Zewnętrzny obraz nadal nie spełnia Owner intent. Domyślny renderer i main pozostają niezmienione.
