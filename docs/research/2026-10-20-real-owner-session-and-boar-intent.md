# Splot Next — pierwszy rzeczywisty raport właściciela + obraz
**2026-10-20 • Box3D research child PR #4 • evidence, not release acceptance.**

## Materiały prywatne — nie publikować surowych
Owner dołączył około 71,3 s nagrania 1866×910/30 FPS oraz eksport `splot-playtest-local-v1` z 189 zdarzeniami i około 61 s przebiegu rejestracji. **Nie umieszczać nagrania, jego kadrów ani surowego JSON w publicznym repo.** Eksport zaczyna się o 00:00:05 UTC, a nazwa nagrania sugeruje start o 23:59:48 UTC; przesunięcie około 17 s jest orientacyjne (nie ma zsynchronizowanego znacznika wideo). Eksport ma `inProgress: true`, `endedAt: null`: to **migawka trwającego testu**, nie zapis zamkniętej sesji.

Nagranie pozwala obejrzeć chwycenie skrzyni, wspinanie po rampie, przejście z ładunkiem przez podest, zejście i upadek, swobodne bieganie do dzika oraz obracanie kamery. Kamera i wygląd świata nadal są bardzo surowe. W raporcie liczba elementów konstrukcyjnych wynosiła stale 7 — Owner nie testował w tej próbie przebudowy geometrii.

## Co realnie wynika z raportu
- Chwyt `crate-1`: włączenie około `t=1.86 s`, świadome zwolnienie około `t=12.24 s`; **10.38 s nieprzerwanego aktywnego chwytu**. To istotny kontrprzykład do naiwnego wniosku z wcześniejszego czerwonego stałoinputowego testu, że chwyt Box3D jest praktycznie bezużyteczny. Nie dowodzi to jeszcze pełnego feelingu ani dobrego zachowania przy innych masach.
- Przy 21 próbkowanych pomiarach podczas pierwszego chwytu dystans XY gracz–skrzynia pozostawał w przybliżeniu **0.75–1.45 m** (rejestrator próbkował około 2 Hz; lokalne maksima między próbkami są nieznane). Wznoszenie obojga po rampie do wysokości około 2.4 m i zejście odbyło się w tym samym świecie; rejestrator zapisuje lądowanie skrzyni na rampie i na gruncie.
- **Dzik**: w 116 z 123 próbek pozycja (34.54, 12.51) nie zmieniała się, od `t≈3.51 s` do `t≈61.07 s`. Repo podaje `food: (35,12)`. Odległość pozioma dzika do jedzenia wynosi `sqrt(.46²+.51²)≈0.687 m`, a adapter Box3D `src/next/box3d-live.mjs` zleca ruch wyłącznie kiedy `d>.8`. **To celowe zatrzymanie po dojściu do jedzenia, nie potwierdzona awaria solvera.**
- Owner testował bliskie mijanie dzika; rejestrator wykrył **3 wejścia w strefę bliskości** i najmniejsze *próbkowane* nakładanie obrysów w poziomie około **0.70 m**. Nie ma twardej kolizji aktor–aktor w wariancie Box3D; to świadectwo obecnego kontraktu, nie pomiar impulsywnych zderzeń.
- Większość kolejnych sekund Owner wykorzystał na ruch/kamerę, następnie znów chwycił skrzynię około `t=56.60 s`. Eksport kończy się z aktywną sesją i aktywnym chwytem, więc nie interpretować końca jako niekontrolowanego zamknięcia lub zerwania.

## Korekta metodologiczna
Eksperymenty w przeglądarce i syntetyczne wejście 100×(+X) służą falsyfikacji, lecz **nie zastępują rzeczywistej zabawy**, gdzie Owner zmienia kierunek, adaptuje napięcie chwytu, eksploruje wysokość i korzysta z kamery. Nie należy stroić całego chwytu pod arbitralny próg jednego synthetic replay. Odróżniać: (1) fizyczne granice, (2) zamiar/controller authority, (3) obraz i UX, (4) rzeczywistą sprawczość.

## Wykonany, ograniczony krok
Dodano `src/next/boar-intent.mjs` — izolowany i deterministyczny lokalny wybór kierunku dla dzika, **bez własnego solvera**. `forage` pozostaje domyślną oryginalną polityką; po dojściu do jedzenia stan to `feeding` (semantyczny cel, nie nowa animacja). Wariant `responsive` reaguje na bliskość gracza przy wspólnej wysokości, z histerezą i powrotem do jedzenia, bez teleportu, twardej kolizji i uruchamiania pełnego systemu AI. W Box3D można przełączać zachowanie w żywej grze (`Dzik: żeruje` ↔ `Dzik: reaguje`) albo `?physics=box3d&boar=responsive`; Rapier pozostaje punktem odniesienia.

Dodatkowo opt-in journal zapisuje semantyczny zamiar dzika (tryb, cel, fazę, odległość od jedzenia), azymut i orientację kamery, a `observedAt`/`windowSeconds` rozróżnia migawkę trwającego testu od zamkniętej sesji. Nadal **żadnej automatycznej transmisji, historii innych kart ani ustalania dostępności użytkownika**. Wybór Ownera pozostaje w pełni odwracalny.

## Weryfikacja i ograniczenia
- 4/4 boar-intent pure tests PASS w izolowanym runnerze V8, 5/5 playtest-journal tests PASS z tym samym ograniczeniem; nie oznacza to pełnego Node/Chromium QA.
- Standalone `Splot_Next_GRAJ.html` przebudowany z 15 modułów. Całość parsuje się w V8; 47 jawnych ID elementów JS pasuje do HTML.
- Izolowana zewnętrzna przeglądarka nie dostarczyła wiarygodnego wyniku dynamicznego UI. **Brak zatwierdzenia nowego zachowania w prawdziwej rozgrywce i brak testu na telefonie.** Nie otwierano nowych kart Opery w celu jego wymuszania, zgodnie z feedbackiem Ownera o kradzieży fokusu.
- Stan `main` i PR #3 nienaruszony; PR #4 to odizolowana gałąź badawcza.

## Kolejny próg wartości
Nie budować nowej wielkiej architektury NPC pod jeden boar fixture. Sprawdzić, czy **reagujący dzik realnie wzbogaca improwizowaną zabawę**: bieganie wokół zwierzęcia, prowadzenie skrzyni przez jego teren, mijanie na podwyższeniu, niezamierzona konfrontacja. Jeśli reaktywność jest sztuczna albo denerwująca, zwykły tryb pozostaje preferowany. Równolegle nadal priorytetem są materialna konstrukcja, manipulacja, kontakt z ciężarem, wizualna czytelność i własny charakter świata. Nie przechodzić na nową architekturę tylko dlatego, że testy liczbowe są zielone.
