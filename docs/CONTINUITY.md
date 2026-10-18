# Kontrprzykład K3 i odzyskanie ciągłości

K3 (samodzielny solver geometrii) pokazywał dwa parametryczne podesty, rampy i skrzynię sterowaną poleceniem. 15/15 lokalnych testów nie odkryło utraty działań: chwytu, dzika, authoringu, większej mapy, stylu ani eksportu. Owner ocenił ten produkt jako wyraźny regres. Dlatego testy geometrii nie zastępują testów całego doświadczenia. Kod K3 pozostaje **donorem idei**, a nie nową bazą gry.

Ten kandydat bazuje na K2 i stosuje kilkukrotny red-green. Udokumentowane zmiany w testach wynikają z rzeczywistej zmiany fizycznego losu postaci, nie z ukrywania regresu: dawna próba upadku przy y=27 zakładała lądowanie na gruncie, ponieważ powietrzny actor nie mógł przesunąć się do prawdziwego muru. Po wprowadzeniu ograniczonej kontroli lotu kończy na murze z górną powierzchnią 2.2; dodano oddzielny test przy y=27.95 z prawdziwym lądowaniem na gruncie.

Próba granic rampy: po dodaniu pełnej bryły na x37 zablokowaliśmy wejście z rampy na most i cofnięto wariant. Cienka płyta uwzględnia pustą przestrzeń poniżej górnego odcinka; collision footprint nadal jest uproszczone i wymaga walidacji z przyszłym solverem.

**Ograniczenie badania:** pełny gameplay review na urządzeniu Ownera nie wykonany; informacja o stabilności dotyczy wybranych przypadków testowych, nie wszystkich kształtów i przyszłych konstrukcji.
