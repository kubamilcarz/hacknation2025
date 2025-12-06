from django.db import models


class Document(models.Model):
    pesel = models.CharField(max_length=11)
    nr_dowodu = models.CharField(max_length=11)
    imie = models.CharField(max_length=255)
    nazwisko = models.CharField(max_length=255)
    data_urodzenia = models.DateField()
    miejsce_urodzenia = models.CharField(max_length=255)
    numer_telefonu = models.CharField(max_length=11, null=True, blank=True)

    # miejsce zamieszkania
    ulica = models.CharField(max_length=255)
    nr_domu = models.CharField(max_length=11)
    nr_lokalu = models.CharField(max_length=11, blank=True, null=True)
    miejscowosc = models.CharField(max_length=255)
    kod_pocztowy = models.CharField(max_length=6)
    nazwa_panstwa = models.CharField(max_length=255, null=True, blank=True)

    # adres ostatniego zamieszkania w Polsce
    ulica_ostatniego_zamieszkania = models.CharField(max_length=255, null=True, blank=True)
    nr_domu_ostatniego_zamieszkania = models.CharField(max_length=11, null=True, blank=True)
    nr_lokalu_ostatniego_zamieszkania = models.CharField(max_length=11, null=True, blank=True)
    miejscowosc_ostatniego_zamieszkania = models.CharField(max_length=255, null=True, blank=True)
    kod_pocztowy_ostatniego_zamieszkania = models.CharField(max_length=6, null=True, blank=True)

    # adres korespondencji
    typ_korespondencji = models.CharField(max_length=255, null=True, blank=True)
    ulica_korespondencji = models.CharField(max_length=255, null=True, blank=True)
    nr_domu_korespondencji = models.CharField(max_length=11, null=True, blank=True)
    nr_lokalu_korespondencji = models.CharField(max_length=11, null=True, blank=True)
    miejscowosc_korespondencji = models.CharField(max_length=255, null=True, blank=True)
    kod_pocztowy_korespondencji = models.CharField(max_length=6, null=True, blank=True)
    nazwa_panstwa_korespondencji = models.CharField(max_length=255, null=True, blank=True)

    # adres miejsca prowadzenia działalności gospodarczej
    ulica_dzialalnosci = models.CharField(max_length=255, null=True, blank=True)
    nr_domu_dzialalnosci = models.CharField(max_length=11, null=True, blank=True)
    nr_lokalu_dzialalnosci = models.CharField(max_length=11, null=True, blank=True)
    miejscowosc_dzialalnosci = models.CharField(max_length=255, null=True, blank=True)
    kod_pocztowy_dzialalnosci = models.CharField(max_length=6, null=True, blank=True)
    nr_telefonu_dzialalnosci = models.CharField(max_length=11, null=True, blank=True)

    # adres sprawowania opieki na dzieckiem
    ulica_opieki = models.CharField(max_length=255, null=True, blank=True)
    nr_domu_opieki = models.CharField(max_length=11, null=True, blank=True)
    nr_lokalu_opieki = models.CharField(max_length=11, null=True, blank=True)
    miejscowosc_opieki = models.CharField(max_length=255, null=True, blank=True)
    kod_pocztowy_opieki = models.CharField(max_length=6, null=True, blank=True)
    nr_telefonu_opieki = models.CharField(max_length=11, null=True, blank=True)

    # dane osoby zgłaszającej o wypadku
    imie_zglaszajacego = models.CharField(max_length=255, null=True, blank=True)
    nazwisko_zglaszajacego = models.CharField(max_length=255, null=True, blank=True)
    pesel_zglaszajacego = models.CharField(max_length=11, null=True, blank=True)
    nr_dowodu_zglaszajacego = models.CharField(max_length=11, null=True, blank=True)
    data_urodzenia_zglaszajacego = models.DateField(null=True, blank=True)
    nr_telefonu_zglaszajacego = models.CharField(max_length=11, null=True, blank=True)

    # adres zamieszkania zgłaszającego o wypadku
    ulica_zglaszajacego = models.CharField(max_length=255, null=True, blank=True)
    nr_domu_zglaszajacego = models.CharField(max_length=11, null=True, blank=True)
    nr_lokalu_zglaszajacego = models.CharField(max_length=11, null=True, blank=True)
    miejscowosc_zglaszajacego = models.CharField(max_length=255, null=True, blank=True)
    kod_pocztowy_zglaszajacego = models.CharField(max_length=6, null=True, blank=True)

    # adres zamieszkania zglaszajacego o wypadku w Polsce
    ulica_zglaszajacego_ostatniego_zamieszkania = models.CharField(max_length=255, null=True, blank=True)
    nr_domu_zglaszajacego_ostatniego_zamieszkania = models.CharField(max_length=11, null=True, blank=True)
    nr_lokalu_zglaszajacego_ostatniego_zamieszkania = models.CharField(max_length=11, null=True, blank=True)
    miejscowosc_zglaszajacego_ostatniego_zamieszkania = models.CharField(max_length=255, null=True, blank=True)
    kod_pocztowy_zglaszajacego_ostatniego_zamieszkania = models.CharField(max_length=6, null=True, blank=True)

    # adres do korespondencji zglaszajacego o wypadku
    typ_korespondencji_zglaszajacego = models.CharField(max_length=255, null=True, blank=True)
    ulica_korespondencji_zglaszajacego = models.CharField(max_length=255, null=True, blank=True)
    nr_domu_korespondencji_zglaszajacego = models.CharField(max_length=11, null=True, blank=True)
    nr_lokalu_korespondencji_zglaszajacego = models.CharField(max_length=11, null=True, blank=True)
    miejscowosc_korespondencji_zglaszajacego = models.CharField(max_length=255, null=True, blank=True)
    kod_pocztowy_korespondencji_zglaszajacego = models.CharField(max_length=6, null=True, blank=True)
    nazwa_panstwa_korespondencji_zglaszajacego = models.CharField(max_length=255, null=True, blank=True)

    # informacje o wypadku
    data_wypadku = models.DateField()
    godzina_wypadku = models.TimeField()
    miejsce_wypadku = models.CharField(max_length=255)
    planowana_godzina_rozpoczecia_pracy = models.TimeField()
    planowana_godzina_zakonczenia_pracy = models.TimeField()
    rodzaj_urazow = models.TextField()
    szczegoly_okolicznosci = models.TextField()
    czy_udzielona_pomoc = models.BooleanField(default=False)
    miejsce_udzielenia_pomocy = models.CharField(max_length=255, null=True, blank=True)
    organ_postepowania = models.CharField(max_length=255, null=True, blank=True)
    czy_wypadek_podczas_uzywania_maszyny = models.BooleanField(default=False)
    opis_maszyn = models.TextField(null=True, blank=True)
    czy_maszyna_posiada_atest = models.BooleanField(default=False, null=True, blank=True)
    czy_maszyna_w_ewidencji = models.BooleanField(default=False, null=True, blank=True)


class Witness(models.Model):
    imie = models.CharField(max_length=255)
    nazwisko = models.CharField(max_length=255)
    ulica = models.CharField(max_length=255)
    nr_domu = models.CharField(max_length=11)
    nr_lokalu = models.CharField(max_length=11, blank=True, null=True)
    miejscowosc = models.CharField(max_length=255)
    kod_pocztowy = models.CharField(max_length=6)
    nazwa_panstwa = models.CharField(max_length=255, null=True, blank=True)
    document = models.ForeignKey(Document, on_delete=models.CASCADE)


