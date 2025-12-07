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
        def _get(obj, attr, default=None):
            if isinstance(obj, dict):
                return obj.get(attr, default)
            return getattr(obj, attr, default)

        def _is_truthy(value):
            if isinstance(value, bool):
                return value
            if isinstance(value, str):
                return value.strip().lower() in {"true", "1", "tak", "yes"}
            return bool(value)

        witnesses = _get(instance, "witnesses", [])
        if hasattr(witnesses, "all"):
            witnesses = list(witnesses.all())
        if not isinstance(witnesses, (list, tuple)):
            witnesses = []

        czy_poszkodowany_jest_zglaszajacy = _get(instance, "imie_zglaszajacego") in (None, "")

        return {
            "czy_poszkodowany_jest_osobą_zgłaszającą": czy_poszkodowany_jest_zglaszajacy,
            "data_wypadku": _get(instance, "data_wypadku"),
            "godzina_wypadku": _get(instance, "godzina_wypadku"),
            "miejsce_wypadku": _get(instance, "miejsce_wypadku"),
            "planowana_godzina_rozpoczecia_pracy": _get(instance, "planowana_godzina_rozpoczecia_pracy"),
            "planowana_godzina_zakonczenia_pracy": _get(instance, "planowana_godzina_zakonczenia_pracy"),
            "rodzaj_urazow": _get(instance, "rodzaj_urazow"),
            "szczegoly_okolicznosci": _get(instance, "szczegoly_okolicznosci"),
            "czy_udzielona_została_pomoc": _is_truthy(_get(instance, "czy_udzielona_pomoc", False)),
            "miejsce_udzielenia_pomocy": _get(instance, "miejsce_udzielenia_pomocy"),
            "organ_postępowania": _get(instance, "organ_postepowania"),
            "czy_wypadku_podczas_uzywania_maszyny": _is_truthy(_get(instance, "czy_wypadek_podczas_uzywania_maszyny", False)),
            "opis_maszyny": _get(instance, "opis_maszyn"),
            "czy_maszyna_posiada_atest": _get(instance, "czy_maszyna_posiada_atest"),
            "czy_maszyna_w_ewidencji": _get(instance, "czy_maszyna_w_ewidencji"),
            "liczba_świadków": len(witnesses),
            "lista_załączników": [],
        }
