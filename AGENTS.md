# Splot — kontrakt pracy agentów

1. **Owner-observed FAIL ma veto** nad PASS kernela, estetyki lub syntetycznej przeglądarki. Nie usprawiedliwiaj gorszej gry czystszą geometrią.
2. **Nie promuj laboratorium do następcy gry.** K3 ma dawstwo geometrii, ale nie odziedziczył chwytu, dzika, autorstwa, świata ani języka obrazu — Owner odrzucił go jako grę.
3. Zmiana substytutu może wyrzucić cały stary kod. Musi jednak jawnie porównać realne możliwości: ruch, chwyt, pchanie, porzucanie, edycję w kilku regionach, autonomię, zapis, kadr i telefon. Zastępuj możliwości czymś lepszym, nie licz linijek.
4. Red-green: najpierw reprodukcja objawu, potem minimalna hipoteza, zmiana, pełna regresja, Chromium, swobodna próba oraz raport granic dowodu.
5. Bramka publikacji grywalnej: kilka minut swobodnej interakcji; desktop i mobilne widoki; przyciski faktycznie dostępne i używane; obraz czytelny bez debugowania; porównanie ze starszą wersją; zawsze status Owner testu.
6. Geometria, podparcia, promienie, rendering, autorstwo i nawigacja powinny wywodzić się z kompatybilnych faktów świata. **Jeden XYZ nie oznacza automatycznie spójnej fizyki ani rozwiązanego 2.5D.**
7. Materiał źródłowy Ownera: nagrania, surowe zapisy, prywatne rozmowy i zewnętrzne modele **nie są automatycznie do publikacji** w publicznym repo.
8. Repo, Jaskinia i Feniks Studio mają oddzielne odpowiedzialności. Splot nie przejmuje ich kodu, architektury ani harmonogramu. Integrację uzasadnia rzeczywisty, testowalny przypadek użycia.
9. Dług i otwarte kontrprzykłady są jawne. Nie kasuj wad przez przepisywanie testu, chyba że nowy wynik jest poprawny według rzeczywistych zasad świata — zachowaj uzasadnienie i niezależne próby obydwu sytuacji.
10. Raportuj Ownerowi **krótko**, pracuj i testuj **długo**. Staraj się prowadzić autonomiczne wieloiteracyjne kampanie; nie kończ po pierwszym lokalnym PASS.

11. **Mobile input is a product gate:** no positive label from tapping one button in Playwright. Check real pointer movement, hold, second-finger action, cancel, scroll/text selection, menu state and rotation at 320×568, 393×852 and 844×390. A physical Owner phone test remains separate.
12. **A screen is not an occlusion proof.** Compare geometry, support, ray, actor layering and surface picking. Camera cutaway is a view aid. Do not call it full 2.5D or depth correctness.
