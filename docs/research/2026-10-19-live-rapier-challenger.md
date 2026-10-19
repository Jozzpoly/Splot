# Splot Next — pierwszy Rapier w żywej grze (19.10.2026)

**STATUS: research draft.** Nie jest to zatwierdzony silnik, nie jest to nowa gra, nie jest to merge do main ani zastąpienie wcześniejszego Owner FAIL.

## Dlaczego wykonaliśmy właśnie tę kampanię

Po K2 → K3 → PR #2 → PR #3 oraz krytycznej analizie 77-sekundowego nagrania Ownera z 19.10 uznaliśmy, że dalsze łatanie własnego mini-solvera nie jest zasadne bez konkurencyjnego testu. Nowa próba nie zmienia kamery, UI, edytora ani renderera. Zachowuje tę samą grywalną scenę z rampą, podestem, skrzynią, dzikiem i niezależnymi częściami. Wariant kontrolny pozostaje bez zmian.

**Uruchomienie**: `src/next/Splot_Next_GRAJ.html?physics=rapier`, przy publicznym hostowaniu pliku. Wariant oryginalny: ten sam plik bez parametru. Rapier jest ładowany asynchronicznie z przypiętej wersji `@dimforge/rapier3d-compat@0.21.0` przez esm.sh, więc eksperyment wymaga działającej sieci. W razie braku biblioteki grywalny program zachowuje poprzedni model i raportuje `legacy-fallback` — **nie traktować tego jako testu Rapier**.

## Co zostało faktycznie zaimplementowane

- `src/next/rapier-live.mjs`: wstrzykiwany adapter Rapier, odrębny od źródła prawdy `spatial-core`; Z-up, collider cuboid dla elementów `box`, obrócony cuboid dla `panel`, zachowanie tożsamości części i synchronizacja ich usuwania/dodawania po zmianie `scene.revision`.
- Kinematyczny kontroler kapsułowy dla człowieka i dzika; fizyczne dynamiczne skrzynie oraz grawitacja; jeden fixed step. Stary `spatial-sim.mjs` pozostaje kontrolą i nie został usunięty.
- Chwyt: rzeczywisty jednostronny więz linowy Rapier między kinematycznym graczem a dynamiczną skrzynią oraz ograniczenie oddalania się sterowanej postaci, gdy ciężar nie nadąża. Nadal bardzo wczesna mechanika; brak rąk, stawów manipulacyjnych, kontroli momentu i dokładnej animacji.
- Dodanie bryły przecinającej aktora jest dozwolone (permissive authoring). Adapter próbuje lokalnej relokacji i generuje zdarzenie `authoring-contact-resolved` albo jawne `authoring-contact-unresolved`. Nie jest to pełny solver kontaktów podczas edycji. Relokacja może być mechanicznie lub wizualnie zbyt gwałtowna i **nie jest rozwiązaniem docelowym**.
- Przy inicjalizacji kontaktów konieczny okazał się krok rozgrzewający silnik Rapier. Bez niego kinematyczna kapsuła kończyła około 0.05 m poniżej gruntu, choć UI deklarował `ground`. Po poprawce obserwowano `Z 0.00 m` przy spoczynku.

## Wynik testów w prawdziwej sesji Opera (desktop)

Badawcze zapytania `?physics=rapier&probe=...` przygotowują kontrolowaną próbę i wykonują kroki ruchu **w tej samej scenie i tej samej warstwie symulacji**, po czym zatrzymują rozgrywkę do inspekcji. Są to **programowe bodźce**, nie test fizycznego dotyku ani rzeczywistego inputu WASD.

| Próba | Wynik | Dane |
|---|---|---|
| `ascent` | PASS | X≈22.38, stopy Z≈2.42, podpora `footbridge-deck`. Start X=12, Y=13, Z=0; 225 kroków ruchu po rampie. |
| `fall` | PASS | Po usunięciu `footbridge-deck` aktor spadł do Z=0 i podpory `ground` w 140 krokach. |
| `edit` | PASS (lokalna polityka) | Bryła utworzona wokół postaci; po synchronizacji colliderów `clearance=true`, zdarzenie `authoring-contact-resolved`. Nie testuje wszystkich przypadków. |
| `grip` | PASS (ograniczony więz) | 100 kroków ciągłego przeciągania: gracz X≈19.01, skrzynia X≈17.47; maksymalna odległość ≈1.54 m, chwyt utrzymany. |

Dodatkowo normalna scena bez parametru `probe` otworzyła się i renderowała w Operze w trybie `webgl-depth · rapier`. Utrzymany został ten sam rysunek sceny, urządzenia UI i publiczny builder.

**Ważne skorygowane błędy podczas kampanii:** początkowy zintegrowany kontroler blokował wejście przy X≈12.93; problem wynikał z polityki spadania podczas kontaktu na rampie. Pierwszy test chwytu błędnie uznawał przesunięcie skrzyni o 0.2 m za sukces; zaostrzono go do ciągłego ruchu i ograniczenia rozciągnięcia. Inicjalny KCC z niewygrzanym broadphase umożliwiał jednorazowy zły krok pod ziemię — rozwiązano rozgrzaniem. Nie przepisywać tych porażek jako sukcesów od początku.

## Granice dowodów / długi otwarte

1. **Fizyczny telefon nieprzetestowany.** Testy starego UI w emulowanym Chromium przechodziły wcześniej; dla włączonego Rapier wykonano tylko sesję Opera desktop. Brak pomiarów kosztu WASM na urządzeniu. HUD `ms CPU` to nie rzeczywisty GPU frame time i nie wydajność całej gry.
2. **Nie jest to pełna dynamika konstrukcji.** Wszystkie istniejące bryły świata są traktowane jako statycznie zakotwiczone, nawet jeśli zawisną w powietrzu; `motionType`, połączenia, siły nośne, obciążenia i zawalenie konstrukcji pozostają otwarte.
3. **Grafika i kolizja nie są identycznymi reprezentacjami.** Mają wspólny autorytatywny dokument `scene`, ale aktywne proxy colliderów Rapier trzeba walidować na bryłach obracanych i stykach. Dynamiczna skrzynia ma tymczasowo zablokowane obroty, bo renderer nadal maluje ją jako osiowo ustawione pudełko.
4. **Ruch jest oparty na KCC, nie „realistycznym ciele”.** Brak pełnej dynamiki postaci, bezwładności i masy przy wszystkich interakcjach. Ograniczenie więzu przy chwycie jest eksperymentalne.
5. **Authoring overlap**: lokalne przestawienie aktora po zmianie geometrii może dawać niepożądaną zmianę położenia; konieczny test Owner i silniejszy kontrakt edycji. Brak generycznej fizyki części.
6. Zapis JSON w UI eksportuje dokument świata i widoczne ciała, ale **nie serializuje natywnego stanu solvera** (prędkości, więzów i śpiących wysp) oraz nie daje pełnego round-trip gameplay state. Nie promować jako pełny save.
7. CDN jest tymczasową zależnością sieciową. Do wydania potrzebny deterministyczny sposób bundlowania, przegląd praw/licencji i integralności, test offline/urządzenia oraz jasny fallback.
8. **Feel i wizualny charakter świata Ownera nie zostały ocenione.** Obraz Splot Next nadal jest laboratoryjny. Celem jest świat z żywym działaniem, nie własność „używamy Rapier”.

## Następna decyzja

Nie dokładać nowego renderera ani silnika konstrukcyjnego. Umożliwić Ownerowi swobodny, nieprzygotowany test **dwóch wersji tej samej gry**, ocenić ruch rampą, chwyt, przesuwanie skrzyń, zrzut, edycję i doświadczenie mobilne. Dopiero po tej obserwacji wybierać: rozwijać Rapier jako kontakt/dynamikę czy wrócić do pytania o inny fundament. Nie scalać z `main`; PR #3 pozostaje draft.

Ta kampania jest ważnym rezultatem technicznym i obroną metody falsyfikacji, **nie zwycięstwem jakości gry**.
