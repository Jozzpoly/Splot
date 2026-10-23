# Splot Next — punkt kontrolny przed swobodnym testem Ownera
**22 października 2026 · PR #5 DRAFT · nie `main`**

## Jaki świat testujemy?
Pobierz pojedynczy [**Splot_Next_GRAJ.html**](../src/next/Splot_Next_GRAJ.html) przez **Download raw** z gałęzi PR #5 i otwórz lokalnie w Chrome lub innej przeglądarce z dostępem do internetu. **Nie uruchamiaj historycznego K2 z `main`** — to inne doświadczenie. Box3D WASM jest pobierany przy starcie z zewnętrznego CDN, więc to NIE jest test offline. Zwykłe wejście nie wymaga parametrów URL. Przed grą sprawdź widoczne **„Box3D · aktywna fizyka badawcza”**; ostrzeżenie „AWARIA” oznacza awaryjną, STARSZĄ fizykę i taki test nie sprawdza Box3D.

## Krótka trasa pierwszego testu
1. **Obejrzyj i przejdź się** po świecie. WASD na komputerze; mobilnie joystick + przeciąganie drugą dłonią po świecie obraca kamerę poziomo i pionowo. Chwytaj skrzynię (E lub przycisk Chwyt) i obserwuj jej relację z ciałem oraz terenem.
2. **Twórz bez uprzejmości dla silnika.** Stawiaj skrzynie na skrzyniach, obok siebie, także w miejscach, gdzie się przecinają. Przeplataj to autorskimi bryłami i płytami. Obecna badawcza polityka Box3D dopuszcza kontakt, lecz nie obiecuje stabilności każdego wyniku.
3. **Popełnij kilka błędów świadomie.** Popraw autorską zakotwiczoną część, usuń fizyczną skrzynię w stosie, użyj **Cofnij/Ponów**, obserwuj inne ciała. Historia obejmuje 256 ostatnich intencjonalnych działań na częściach i skrzyniach; nie przewija symulacji w czasie. Na telefonie Cofnij/Ponów działa również drugim palcem przy trzymaniu joysticka.
4. **Sprawdź trafianie w materię.** W trybie Usuń wybrany obiekt powinien mieć obrys całej bryły, a nie tylko kropkę. Q/Warstwa przechodzi między warstwami. Spróbuj celowo wskazać coś schowanego za skrzynią. Oceń, czy można zrozumieć, CO zostanie zmienione.
5. **Zapisz → wczytaj → uruchom.** `Zapis JSON` eksportuje lokalny plik. `Wczytaj JSON` waliduje plik, po czym wymaga potwierdzenia zastąpienia bieżącego świata i historii Undo/Redo. Anulowanie zachowuje dotychczasowy świat. Po potwierdzeniu nowy świat czeka na „Uruchom”. To **nowa inicjalizacja Box3D**, a nie odtworzenie dokładnych prędkości i impulsów. Historia Undo/Redo po wczytaniu zaczyna się od zera.

## Granice, których nie wolno pomylić z ukończoną grą
- **Kamera i sterowanie na fizycznym telefonie Ownera nie mają jeszcze akceptacji.** Chrome/CDP sprawdził gesty, nie feel rzeczywistego urządzenia.
- Skrzynie fizyczne i zakotwiczone elementy działają razem, ale **ruchome autorskie bryły nadal mają zablokowany obrót**; płyty nie mają pełnej dynamicznej fizyki. Przełączanie Kotwica/uwolnienie części nie jest tą samą operacją historii, co edycja/skrzyń.
- W ciasnych stosach czytelność poszczególnych brył pozostaje ograniczona. Wariant `?faces=exterior-boxes` jest tylko eksperymentem, nie zatwierdzoną poprawą.
- Regułę skrzyń można porównać przez `?admission=legacy`; nie myl jej z domyślnym swobodniejszym zachowaniem. Tryby `?physics=legacy` i awaryjny fallback służą odrębnym porównaniom.
- **Reset wymaga dwóch świadomych działań w ciągu 6 sekund.** Nie jest to Undo. Przed większym eksperymentem warto zrobić Zapis JSON. Nie obiecujemy autosave ani odzyskania po awarii przeglądarki.
- Scene import maksymalnie 256 autorskich części i 2000 ciał; dokument JSON powyżej 8 MB jest odrzucany. Test nie jest certyfikacją wszystkich możliwych obciążeń.

## Co rzeczywiście potwierdziła automatyzacja
**Code `45ad1fc`**: [Chrome/Box3D #39847405274](https://github.com/Jozzpoly/Splot/actions/runs/39847405274), **90 Node PASS / 0 FAIL / 2 TODO**. Próby objęły realne operacje UI, dwupalczasty Undo/Redo przy joysticku, bezpieczny reset, fizyczne stosy, zaznaczanie i cofanie. [Długi test #39846117325](https://github.com/Jozzpoly/Splot/actions/runs/39846117325) wykonał 64 Undo i 64 Redo przy 177 skrzyniach i 127 częściach oraz **rzeczywisty eksport i reimport** ok. 82 KB JSON, po którym Box3D wznowił fizykę bez niepoprawnych pozycji. Nie są to dowody przyjemności, ergonomii, czytelności ani bezpieczeństwa wszystkich przypadków.

**Najcenniejszy feedback Ownera:** spontaniczne zachowania, punkty „chciałem to zrobić, ale...”, nietrafione obiekty, nieoczekiwane konsekwencje fizyki oraz sytuacje, po których chce się od razu poprawić lub zbudować coś kolejnego. Opcjonalnie włącz `Zacznij test`, potem wyeksportuj **Raport** oraz krótki film lub obraz z własnej sesji. Raport jest lokalny i nie wysyła się automatycznie. Nie potrzeba śledzić logów ani korzystać z terminala.
