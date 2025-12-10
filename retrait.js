import { connectWallet, validator, validatorAddress } from "./common.js";
import {
    Lucid,
    Blockfrost,
    Data,
    fromText,
    Constr
} from "https://unpkg.com/lucid-cardano@0.10.11/web/mod.js";

const submitBtn = document.getElementById("submitBtn")

submitBtn.addEventListener('click', async function () {

    const { walletAddress, lucid } = await connectWallet()
    const scriptUtxos = await lucid.utxosAt(validatorAddress)
    const pkh = lucid.utils.getAddressDetails(walletAddress).paymentCredential.hash
    console.log("address details", pkh)
    let gooScriptUtxo = null
    let goodDatum = null
    for (let utxo of scriptUtxos) {
        let datum = utxo.datum
        let decodedDatum = Data.from(datum)
        console.log({ decodedDatum })
        if (decodedDatum.fields[1] === pkh) {
            gooScriptUtxo = utxo
            goodDatum = decodedDatum.fields
        }

    }
    if (gooScriptUtxo === null) {
        alert("Installer un portefeuiile")
        return
    }
    console.log({ gooScriptUtxo });
    const reconstitutedAddress = lucid.utils.credentialToAddress({
        hash: pkh,
        type: "Key"
    });
    console.log({ reconstitutedAddress })
    console.log({ walletAddress })
    const utxos = await lucid.wallet.getUtxos()
    const redeemer = Data.to(
        new Constr(0, [
            pkh
        ])
    )
    try {
        const tx = await lucid
            .newTx()
            .collectFrom(utxos)
            .collectFrom([gooScriptUtxo], redeemer)
            .payToAddress(
                reconstitutedAddress,
                {
                    lovelace: BigInt(goodDatum[0])
                }
            )
            .addSignerKey(pkh)
            .attachSpendingValidator(validator)
            .complete()

        const signedTx = await tx.sign().complete()
        const txHash = await signedTx.submit()
        console.log("txHash is ", txHash)
        document.getElementById("hash").innerHTML =
            `<a href="https://preprod.cexplorer.io/tx/${txHash}"
            target="_blank"
            style="color:#7c3aed; text-decoration:underline;">
            Transaction on preprod
         </a>`
    } catch (error) {
        console.log({ error });

    }


})



