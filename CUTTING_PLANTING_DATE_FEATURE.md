# Ajout du Champ Date de Plantation dans le Formulaire de Cutting Operation

## ✅ Modification Effectuée

**Objectif** : Permettre l'affichage et la modification de la date de plantation lors de l'édition d'une opération de coupe (Cutting Operation).

---

## 🔧 Changements Appliqués

### 1. Composant CuttingOperationFormModal.tsx

#### A. Ajout du Champ `plantingDate` dans le FormData

```typescript
const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    plantingDate: new Date().toISOString().split('T')[0], // ✅ NOUVEAU
    siteId: sites[0]?.id || '',
    serviceProviderId: serviceProviders[0]?.id || '',
    // ... autres champs
});
```

#### B. Chargement de la Date de Plantation Existante

Lors de l'édition d'une opération, le système charge automatiquement la date de plantation des cycles de cultivation associés :

```typescript
useEffect(() => {
    if (operation) {
        // Trouver les cycles associés à cette opération de coupe
        const relatedCycles = cultivationCycles.filter(cycle => 
            cycle.cuttingOperationId === operation.id
        );
        
        // Extraire la date de plantation du premier cycle
        const plantingDate = relatedCycles.length > 0 
            ? relatedCycles[0].plantingDate 
            : new Date().toISOString().split('T')[0];
        
        setFormData({
            // ... autres champs
            plantingDate: plantingDate,
        });
    }
}, [operation, isOpen, cultivationCycles]);
```

#### C. Validation de la Date de Plantation

La date de plantation doit être **égale ou postérieure** à la date de l'opération de coupe :

```typescript
// Vérifier que la date de plantation n'est pas antérieure à la date de l'opération
if (formData.plantingDate && formData.date && formData.plantingDate < formData.date) {
    newErrors.plantingDate = t('validationPlantingDateAfterCutting');
}
```

#### D. Mise à Jour des Cycles de Cultivation

Lors de la sauvegarde, les cycles de cultivation associés sont mis à jour avec la nouvelle date de plantation :

```typescript
if (operation) {
    updateCuttingOperation({ ...operation, ...operationData });
    
    // Mettre à jour la date de plantation des cycles associés
    const relatedCycles = cultivationCycles.filter(cycle => 
        cycle.cuttingOperationId === operation.id
    );
    
    if (relatedCycles.length > 0) {
        const updatedCycles = relatedCycles.map(cycle => ({
            ...cycle,
            plantingDate: formData.plantingDate
        }));
        updateMultipleCultivationCycles(updatedCycles);
    }
}
```

#### E. Interface Utilisateur

Ajout d'un champ de date dans le formulaire (4 colonnes au lieu de 3) :

```jsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <Input label={t('date')} type="date" value={formData.date} ... />
    <Input 
        label={t('plantingDate')} 
        type="date" 
        value={formData.plantingDate} 
        onChange={e => handleChange('plantingDate', e.target.value)} 
        error={errors.plantingDate} 
        required 
    />
    <Select label={t('site')} ... />
    <Select label={t('serviceProvider')} ... />
</div>
```

---

### 2. Fichier de Localisation (operations.ts)

Ajout de la traduction pour le message de validation :

```typescript
validationPlantingDateAfterCutting: { 
  en: 'Planting date must be on or after the cutting date', 
  fr: 'La date de plantation doit être égale ou postérieure à la date de coupe' 
}
```

**Note** : La traduction de `plantingDate` existait déjà :
```typescript
plantingDate: { en: 'Planting Date', fr: 'Date de Plantation' }
```

---

## 📊 Architecture

### Modèle de Données

```typescript
// CuttingOperation (opération de coupe)
interface CuttingOperation {
    id: string;
    date: string;                    // Date de l'opération
    siteId: string;
    serviceProviderId: string;
    moduleCuts: ModuleCutInfo[];     // Modules coupés
    seaweedTypeId: string;
    // ... autres champs
}

// CultivationCycle (cycle de cultivation lié)
interface CultivationCycle {
    id: string;
    moduleId: string;
    plantingDate: string;            // ✅ Date modifiable
    cuttingOperationId?: string;     // Lien vers CuttingOperation
    seaweedTypeId: string;
    status: ModuleStatus;
    // ... autres champs
}
```

### Flux de Données

```
1. Édition d'une Cutting Operation
   ↓
2. Chargement des Cultivation Cycles associés
   (via cuttingOperationId)
   ↓
3. Extraction de la plantingDate du premier cycle
   ↓
4. Affichage dans le formulaire
   ↓
5. Modification par l'utilisateur
   ↓
6. Validation (plantingDate >= date)
   ↓
7. Mise à jour de CuttingOperation
   ↓
8. Mise à jour des plantingDate de tous les cycles liés
```

---

## ✅ Fonctionnalités

### Avant

- ❌ Date de plantation non visible dans le formulaire
- ❌ Date de plantation non modifiable
- ❌ Pas de validation de cohérence temporelle

### Après

- ✅ **Date de plantation affichée** dans le formulaire d'édition
- ✅ **Date modifiable** par l'utilisateur
- ✅ **Validation automatique** : plantingDate ≥ date de coupe
- ✅ **Mise à jour en cascade** de tous les cycles associés
- ✅ **Messages d'erreur clairs** en EN et FR
- ✅ **Interface responsive** avec grid 4 colonnes

---

## 🧪 Scénarios de Test

### Test 1 : Édition avec Date Valide
1. Ouvrir "Edit Cutting Operation"
2. Voir la date de plantation actuelle affichée
3. Modifier la date de plantation (≥ date de coupe)
4. Sauvegarder
5. ✅ Succès : Cycles mis à jour

### Test 2 : Validation - Date Invalide
1. Ouvrir "Edit Cutting Operation"
2. Modifier la date de plantation (< date de coupe)
3. Tenter de sauvegarder
4. ✅ Erreur affichée : "La date de plantation doit être égale ou postérieure à la date de coupe"

### Test 3 : Nouvelle Opération
1. Créer une nouvelle Cutting Operation
2. Date de plantation par défaut = date du jour
3. Modifiable avant sauvegarde
4. ✅ Cycles créés avec la date spécifiée

### Test 4 : Édition - Plusieurs Cycles
1. Ouvrir une opération liée à 5 modules
2. Modifier la date de plantation
3. Sauvegarder
4. ✅ Les 5 cycles sont mis à jour avec la même date

---

## 📝 Validations Implémentées

| Validation | Règle | Message EN | Message FR |
|-----------|-------|-----------|-----------|
| Champ requis | plantingDate doit être renseigné | Required | Requis |
| Date cohérente | plantingDate ≥ date | Planting date must be on or after the cutting date | La date de plantation doit être égale ou postérieure à la date de coupe |

---

## 🎨 Interface Utilisateur

### Disposition du Formulaire

```
┌─────────────────────────────────────────────────────────────────────┐
│ Edit Cutting Operation                                              │
├─────────────────────────────────────────────────────────────────────┤
│ [Date]        [Planting Date*]   [Site]           [Service Provider]│
│ 2024-01-15    2024-01-18         Site A           Provider X        │
│                                                                      │
│ [Seaweed Type*]                                                     │
│ Spinosum                                                            │
│                                                                      │
│ [Modules Selection]                                                 │
│ ☑ A-01 (John Doe)    Lines: [10]                                   │
│ ☑ A-02 (Jane Smith)  Lines: [15]                                   │
│                                                                      │
│ [Beneficiary Farmers]                                               │
│ John Doe, Jane Smith                                                │
│                                                                      │
│ [Unit Price] [Total Lines] [Total Amount]                          │
│ 500         25            12,500                                    │
│                                                                      │
│ [Notes]                                                             │
│                                                                      │
│ ☐ Is Paid  [Payment Date]                                          │
│                                                                      │
│                                    [Cancel] [Save]                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Fichiers Modifiés

1. **components/CuttingOperationFormModal.tsx**
   - Ajout du champ `plantingDate` dans le state
   - Logique de chargement depuis les cycles existants
   - Validation de la date
   - Mise à jour en cascade des cycles
   - Interface utilisateur (grid 4 colonnes)

2. **utils/locales/operations.ts**
   - Ajout de la validation `validationPlantingDateAfterCutting`

---

## 🔗 Ressources

- **Application** : https://3000-ipgxzkc0k8beqtda8wcn9-b32ec7bb.sandbox.novita.ai
- **GitHub** : https://github.com/assamipatrick/SEAFARM-MONITOR-Home
- **Commit** : `344bf34` - "Add planting date field to cutting operation form modal - editable and validated"

---

## ✅ Résultat

**Le formulaire "Edit Cutting Operation" affiche maintenant la date de plantation et permet de la modifier avec validation automatique !**

- ✅ **Champ visible** : Date de plantation affichée dans le formulaire
- ✅ **Modification** : L'utilisateur peut changer la date
- ✅ **Validation** : Vérification automatique (plantingDate ≥ date de coupe)
- ✅ **Mise à jour en cascade** : Tous les cycles liés sont mis à jour
- ✅ **Messages clairs** : Traductions EN/FR
- ✅ **Interface professionnelle** : Grid responsive 4 colonnes

---

**Date** : 20 janvier 2026  
**Version** : 1.0  
**Statut** : ✅ Production Ready
