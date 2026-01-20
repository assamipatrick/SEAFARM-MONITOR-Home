# Correction de la Mise à Jour en Cascade - Cutting Operations

## Problème Identifié

**Bug**: La modification d'une opération de bouturage dans le formulaire modal "Edit Cutting Operation" ne mettait pas à jour toutes les données en aval malgré l'enregistrement.

### Symptômes
- ✅ L'opération de cutting était enregistrée
- ❌ Les cycles de cultivation associés n'étaient pas mis à jour correctement
- ❌ La `plantingDate` était écrasée par la date de l'opération
- ❌ Les modifications de `seaweedTypeId`, `linesPlanted`, etc. n'étaient pas propagées

### Analyse du Problème

Le problème venait de la séquence d'exécution :

1. **Formulaire Modal** appelait `updateCuttingOperation(operation)`
2. **DataContext** mettait à jour les cycles avec `updatedOperation.date` comme `plantingDate` par défaut
3. **Formulaire Modal** appelait ensuite `updateMultipleCultivationCycles()` pour mettre à jour la `plantingDate`
4. **❌ CONFLIT** : La `plantingDate` était écrasée deux fois, causant des incohérences

### Code Problématique (AVANT)

```typescript
// Dans CuttingOperationFormModal.tsx
if (operation) {
    // Étape 1: Mettre à jour l'opération
    updateCuttingOperation({ ...operation, ...operationData });
    
    // Étape 2: Mettre à jour la plantingDate séparément
    const relatedCycles = cultivationCycles.filter(cycle => 
        cycle.cuttingOperationId === operation.id
    );
    
    if (relatedCycles.length > 0) {
        const updatedCycles = relatedCycles.map(cycle => ({
            ...cycle,
            plantingDate: formData.plantingDate // ❌ Peut être écrasée
        }));
        updateMultipleCultivationCycles(updatedCycles);
    }
}
```

```typescript
// Dans DataContext.tsx
const updateCuttingOperation = (updatedOperation: CuttingOperation) => {
    // ...
    setCultivationCycles(prev => prev.map(cycle => {
        if (cycle.cuttingOperationId === updatedOperation.id) {
            return {
                ...cycle,
                seaweedTypeId: updatedOperation.seaweedTypeId,
                linesPlanted: moduleCut.linesCut,
                // ❌ PROBLÈME: plantingDate utilise la date de l'opération
                plantingDate: updatedOperation.date // Écrase la plantingDate de l'utilisateur!
            };
        }
        return cycle;
    }));
};
```

## Solution Implémentée

### Modifications Apportées

#### 1. **Signature de `updateCuttingOperation` Améliorée**

**Fichier**: `contexts/DataContext.tsx`

```typescript
// Interface DataContextType
updateCuttingOperation: (operation: CuttingOperation, plantingDate?: string) => void;

// Implémentation
const updateCuttingOperation = (updatedOperation: CuttingOperation, plantingDate?: string) => {
    // ... (code existant)
    
    // Utiliser plantingDate fournie ou la date de l'opération comme défaut
    const effectivePlantingDate = plantingDate || updatedOperation.date;
    
    // CASCADE UPDATE: Mettre à jour les cycles avec la bonne plantingDate
    setCultivationCycles(prev => prev.map(cycle => {
        if (cycle.cuttingOperationId === updatedOperation.id) {
            const moduleCut = updatedOperation.moduleCuts.find(mc => mc.moduleId === cycle.moduleId);
            
            if (!moduleCut) {
                return null as any; // Supprimer le cycle si le module est retiré
            }
            
            return {
                ...cycle,
                seaweedTypeId: updatedOperation.seaweedTypeId,
                linesPlanted: moduleCut.linesCut,
                plantingDate: effectivePlantingDate, // ✅ Utilise la plantingDate fournie
            };
        }
        return cycle;
    }).filter(Boolean));
    
    // Créer de nouveaux cycles pour les modules ajoutés
    const newModuleCuts = updatedOperation.moduleCuts.filter(
        mc => !existingModuleIds.includes(mc.moduleId)
    );
    
    if (newModuleCuts.length > 0) {
        const newCycles: CultivationCycle[] = newModuleCuts.map(mc => ({
            id: `cycle-${Date.now()}-${Math.random()}`,
            moduleId: mc.moduleId,
            seaweedTypeId: updatedOperation.seaweedTypeId,
            plantingDate: effectivePlantingDate, // ✅ Utilise la plantingDate fournie
            status: ModuleStatus.PLANTED,
            initialWeight: 0,
            cuttingOperationId: updatedOperation.id,
            linesPlanted: mc.linesCut
        }));
        
        setCultivationCycles(prev => [...prev, ...newCycles]);
    }
};
```

#### 2. **Formulaire Modal Simplifié**

**Fichier**: `components/CuttingOperationFormModal.tsx`

```typescript
const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
    }
    
    const operationData: Omit<CuttingOperation, 'id'> = {
        date: formData.date,
        siteId: formData.siteId,
        serviceProviderId: formData.serviceProviderId,
        seaweedTypeId: formData.seaweedTypeId,
        moduleCuts: formData.moduleCuts.filter(mc => mc.linesCut > 0),
        unitPrice: parseFloat(formData.unitPrice),
        totalAmount: calculatedTotals.totalAmount,
        isPaid: formData.isPaid,
        paymentDate: formData.isPaid ? formData.paymentDate : undefined,
        notes: formData.notes || undefined,
        beneficiaryFarmerId: operation?.beneficiaryFarmerId,
    };
    
    if (operation) {
        // ✅ Solution: Passer la plantingDate directement à updateCuttingOperation
        // La mise à jour en cascade est automatiquement gérée
        updateCuttingOperation(
            { ...operation, ...operationData },
            formData.plantingDate // Passer la plantingDate pour la cascade
        );
    } else {
        addCuttingOperation(operationData);
    }
    onClose();
};
```

**Changements**:
- ✅ Un seul appel à `updateCuttingOperation` avec la `plantingDate` en paramètre
- ✅ Plus besoin d'appeler `updateMultipleCultivationCycles` séparément
- ✅ Code plus simple et moins de risques d'incohérences

## Architecture de la Cascade

### Flux de Mise à Jour Complet

```
┌─────────────────────────────────────────────────────────────┐
│          1. Utilisateur Modifie l'Opération                 │
│         (date, site, modules, prix, plantingDate)           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│    2. Formulaire Modal appelle updateCuttingOperation       │
│          avec l'opération ET la plantingDate                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│         3. DataContext.updateCuttingOperation               │
│                                                             │
│   a) Analyse les changements (prix, modules, site, etc.)   │
│   b) Recalcule et met à jour les crédits fermiers         │
│   c) Met à jour l'opération elle-même                     │
│   d) 🔄 CASCADE: Met à jour tous les cycles liés          │
│       - seaweedTypeId                                       │
│       - linesPlanted                                        │
│       - plantingDate (utilise la valeur fournie!)          │
│   e) Supprime les cycles pour modules retirés             │
│   f) Crée de nouveaux cycles pour modules ajoutés         │
└─────────────────────────────────────────────────────────────┘
```

### Données Mises à Jour en Cascade

| Entité | Champs Mis à Jour | Déclencheur |
|--------|-------------------|-------------|
| **CuttingOperation** | `date`, `siteId`, `serviceProviderId`, `seaweedTypeId`, `moduleCuts`, `unitPrice`, `totalAmount`, `isPaid`, `paymentDate`, `notes` | Formulaire |
| **FarmerCredit** | Recalculé et recréé pour chaque module | Si `unitPrice` ou `moduleCuts` changent |
| **CultivationCycle** | `seaweedTypeId`, `linesPlanted`, `plantingDate` | Si champs impactants changent |
| **CultivationCycle (nouveaux)** | Créés pour nouveaux modules | Si modules ajoutés à `moduleCuts` |
| **CultivationCycle (supprimés)** | Supprimés | Si modules retirés de `moduleCuts` |

## Tests de Validation

### Test 1: Modification de la Date de Plantation

**Scénario**: 
- Opération de cutting existante avec `plantingDate` = "2024-01-15"
- Utilisateur modifie `plantingDate` à "2024-02-01"

**Résultat Attendu**:
- ✅ Tous les cycles liés à l'opération ont `plantingDate` = "2024-02-01"
- ✅ `seaweedTypeId` et `linesPlanted` restent cohérents

**Commande de Test**:
```typescript
// Dans la console du navigateur
const op = cuttingOperations[0];
const cyclesBefore = cultivationCycles.filter(c => c.cuttingOperationId === op.id);
console.log('AVANT:', cyclesBefore.map(c => c.plantingDate));

// Modifier l'opération via le formulaire
// ...

const cyclesAfter = cultivationCycles.filter(c => c.cuttingOperationId === op.id);
console.log('APRÈS:', cyclesAfter.map(c => c.plantingDate));
```

### Test 2: Modification du Type d'Algue

**Scénario**:
- Opération avec `seaweedTypeId` = "algue-rouge"
- 3 cycles associés
- Utilisateur change `seaweedTypeId` à "algue-verte"

**Résultat Attendu**:
- ✅ Tous les 3 cycles ont maintenant `seaweedTypeId` = "algue-verte"
- ✅ `plantingDate` reste inchangée si non modifiée
- ✅ Crédits fermiers recalculés

### Test 3: Ajout/Suppression de Modules

**Scénario**:
- Opération avec 2 modules: M1, M2
- Utilisateur ajoute M3 et retire M1

**Résultat Attendu**:
- ✅ Cycle pour M1 supprimé
- ✅ Cycle pour M2 mis à jour
- ✅ Nouveau cycle créé pour M3 avec la bonne `plantingDate`
- ✅ Crédits fermiers recalculés pour M2 et M3

### Test 4: Modification du Prix Unitaire

**Scénario**:
- Opération avec `unitPrice` = 100 F
- 2 modules avec 10 lignes chacun
- Utilisateur change `unitPrice` à 150 F

**Résultat Attendu**:
- ✅ Crédits fermiers recalculés: 10 * 150 = 1500 F par module
- ✅ `totalAmount` de l'opération = 3000 F
- ✅ Cycles conservent leurs données (seuls les crédits changent)

## Fichiers Modifiés

### 1. `contexts/DataContext.tsx`
- **Ligne 209**: Signature de `updateCuttingOperation` modifiée pour accepter `plantingDate?: string`
- **Lignes ~1180-1280**: Implémentation complète de la mise à jour en cascade

### 2. `components/CuttingOperationFormModal.tsx`
- **Ligne 20**: Retrait de `updateMultipleCultivationCycles` des imports
- **Lignes 183-192**: Simplification de `handleSubmit` - un seul appel à `updateCuttingOperation`

## Avantages de la Solution

### 1. **Cohérence des Données**
- ✅ Une seule source de vérité pour la mise à jour en cascade
- ✅ Pas de conflits entre multiples mises à jour
- ✅ Ordre d'exécution garanti

### 2. **Code Plus Maintenable**
- ✅ Logique de cascade centralisée dans `DataContext`
- ✅ Formulaire modal simplifié (moins de responsabilités)
- ✅ Moins de bugs potentiels

### 3. **Performance**
- ✅ Moins d'appels de mise à jour d'état
- ✅ Un seul re-render au lieu de deux
- ✅ Meilleure expérience utilisateur

### 4. **Extensibilité**
- ✅ Facile d'ajouter d'autres champs en cascade (ex: `initialWeight`)
- ✅ Facile d'ajouter d'autres types d'opérations en cascade
- ✅ Pattern réutilisable pour d'autres entités

## Ressources

- **Application**: https://3000-ipgxzkc0k8beqtda8wcn9-b32ec7bb.sandbox.novita.ai
- **GitHub Repository**: https://github.com/assamipatrick/SEAFARM-MONITOR-Home
- **Commit**: `355a094` - "Fix cascade update: pass plantingDate to updateCuttingOperation for proper data propagation"
- **Documentation Connexe**:
  - `CUTTING_PLANTING_DATE_FEATURE.md` - Ajout du champ plantingDate
  - `CASCADE_DELETE_FEATURE.md` - Suppression en cascade

## Résumé Final

### Problème
La modification d'une opération de bouturage ne mettait pas à jour les cycles de cultivation associés correctement, car la `plantingDate` était écrasée.

### Solution
Passage de la `plantingDate` comme paramètre optionnel à `updateCuttingOperation()`, permettant une mise à jour en cascade cohérente et atomique.

### Résultat
✅ Toutes les modifications d'une cutting operation se propagent automatiquement à tous les cycles de cultivation associés (plantingDate, seaweedTypeId, linesPlanted).

---

**Date de Création**: 2025-01-20  
**Version**: 1.0  
**Auteur**: SEAFARM MONITOR Development Team
