---

# **Deposit Validator — Documentation**

This document explains the structure, purpose, and validation logic of the **Dep** Plutus smart contract written in Haskell (Plutus V2).
The contract enforces two conditions for a withdrawal/spend

1. The transaction must be signed by a specific public key.
2. A specific output must send at least a given amount of ADA to a specific public key hash.

---

## **1. Overview**

This validator controls UTxOs containing a datum of type `DDatum`.
The datum defines:

* **amount**: The minimum amount of ADA required to appear in one of the outputs.
* **signer**: The public key hash (PKH) of the receiver who must get the funds.

The redeemer `WRedeemer` contains a single value:

* A **withdrawer PKH**, representing the participant authorized to spend the script UTxO.

During spending, the validator ensures:

1. The transaction is **signed by the withdrawer**.
2. The transaction includes an output sending **at least `amount` ADA** to the **signer** defined in the datum.

If both conditions are satisfied, the UTxO can be spent.

---

## **2. Data Types**

### **2.1 `DDatum`**

```haskell
data DDatum = DDatum {
    amount :: Integer,
    signer :: PubKeyHash
}
```

Represents the required conditions for releasing funds.

| Field    | Type         | Description                                                              |
| -------- | ------------ | ------------------------------------------------------------------------ |
| `amount` | `Integer`    | Minimum amount of ADA that must appear in an output going to the signer. |
| `signer` | `PubKeyHash` | PKH of the recipient who must receive the ADA.                           |

---

### **2.2 `WRedeemer`**

```haskell
data WRedeemer = WRedeemer PubKeyHash
```

Contains the PKH that is allowed to spend the script UTxO.

| Constructor     | Description                                       |
| --------------- | ------------------------------------------------- |
| `WRedeemer pkh` | Only this PKH must sign the spending transaction. |

---

## **3. Validation Logic**

The core validator function:

```haskell
validator :: DDatum -> WRedeemer -> ScriptContext -> Bool
```

The validation steps:

### **3.1 Check transaction signature**

```haskell
txSign = txSignedBy (scriptContextTxInfo ctx) withdrawerPKH
```

The transaction must be signed by the PKH provided in the redeemer.
If not, validation fails.

---

### **3.2 Check output conditions**

The validator scans all transaction outputs:

```haskell
goodFunds = any (\o ->
    valueOf (txOutValue o) adaSymbol adaToken >= amount datum
    && case addressCredential (txOutAddress o) of
         PubKeyCredential pkh -> pkh == signer datum
         _ -> False
    ) txOutputs
```

For validation to pass, **at least one output** must satisfy:

✔ Contains **≥ `amount` ADA**
✔ Sent to an address whose credential is `PubKeyCredential (signer datum)`

Outputs to scripts or other credentials are ignored.

---

### **3.3 Final condition**

```haskell
in txSign && goodFunds
```

Both conditions must be true.

---

## **4. Untyped Wrapper**

The contract uses the usual Plutus wrapper to convert `BuiltinData` into typed values:

```haskell
untypedValidator :: BuiltinData -> BuiltinData -> BuiltinData -> ()
```

The function throws an error if validation fails using `P.check`.

---

## **5. Building the Script**

The validator is compiled using Template Haskell:

```haskell
validatorScript :: Validator
validatorScript =
  PlutusV2.mkValidatorScript $$(PlutusTx.compile [|| untypedValidator ||])
```

And exported to a `.plutus` file:

```haskell
getCbor :: IO ()
getCbor = writeValidatorToFile "./assets/dep.plutus" validatorScript
```

This file can be used for deployment in wallets, DApps, or off-chain code.

---

## **6. Summary**

This smart contract implements a secure withdrawal mechanism requiring:

1. **Authorization** through a transaction signature.
2. **Guaranteed payout** of a minimum ADA amount to a specified signer.

It is ideal for cases such as:

* Escrow-like deposits
* Controlled withdrawals
* Signed fund release workflows
