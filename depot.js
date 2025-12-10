import { connectWallet, validatorAddress } from "./common.js";
import {
    Lucid,
    Blockfrost,
    Data,
    fromText,
    Constr
} from "https://unpkg.com/lucid-cardano@0.10.11/web/mod.js";

const submitBtn = document.getElementById("submitBtn")

submitBtn.addEventListener('click', async function () {
    const amount = document.getElementById("amount").value
    console.log(amount);

    const { walletAddress, lucid } = await connectWallet()
    const utxos = await lucid.wallet.getUtxos()
    const pkh = lucid.utils.getAddressDetails(walletAddress).paymentCredential.hash
    console.log("address details", pkh)
    const datum = new Constr(0, [
        BigInt(amount * 1_000_000),
        pkh
    ])
    const tx = await lucid
        .newTx()
        .collectFrom(utxos)
        .payToContract(
            validatorAddress,
            {
                inline: Data.to(datum)
            },
            {
                lovelace: BigInt(amount * 1_000_000)
            }
        )
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

})



