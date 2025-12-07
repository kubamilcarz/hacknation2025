from rest_framework import serializers

from api.models import Document, Witness


class WitnessSerializer(serializers.ModelSerializer):
    documentId = serializers.PrimaryKeyRelatedField(source="document", read_only=True)

    class Meta:
        model = Witness
        fields = (
            "id",
            "documentId",
            "imie",
            "nazwisko",
            "ulica",
            "nr_domu",
            "nr_lokalu",
            "miejscowosc",
            "kod_pocztowy",
            "nazwa_panstwa",
        )


class DocumentSerializer(serializers.ModelSerializer):
    witnesses = WitnessSerializer(many=True, read_only=True)

    class Meta:
        model = Document
        fields = "__all__"


class DocumentContextSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = "__all__"

    def to_representation(self, instance):
        return {
            "czy_poszkodowany_jest_osobą_zgłaszającą": instance.imie_zglaszajacego is None or instance.imie_zglaszajacego == "",
            "data_wypadku": instance.data_wypadku,
            "godzina_wypadku": instance.godzina_wypadku,
            "miejsce_wypadku": instance.miejsce_wypadku,
            "planowana_godzina_rozpoczecia_pracy": instance.planowana_godzina_rozpoczecia_pracy,
            "planowana_godzina_zakonczenia_pracy": instance.planowana_godzina_zakonczenia_pracy,
            "rodzaj_urazow": instance.rodzaj_urazow,
            "szczegoly_okolicznosci": instance.szczegoly_okolicznosci,
            "czy_udzielona_została_pomoc": instance.czy_udzielona_pomoc,
            "miejsce_udzielenia_pomocy": instance.miejsce_udzielenia_pomocy,
            "organ_postępowania": instance.organ_postepowania,
            "czy_wypadku_podczas_uzywania_maszyny": instance.czy_wypadek_podczas_uzywania_maszyny,
            "opis_maszyny": instance.opis_maszyn,
            "czy_maszyna_posiada_atest": instance.czy_maszyna_posiada_atest,
            "czy_maszyna_w_ewidencji": instance.czy_maszyna_w_ewidencji,
            "liczba_świadków": len(instance.witnesses.all()),
            "lista_załączników": []
        }
