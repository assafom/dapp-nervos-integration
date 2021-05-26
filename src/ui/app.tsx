import { Amount } from '@lay2/pw-core';
import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import { createChoiceSignature, domainSeparator } from '../common';
import { HeadTailPolyjuice } from '../lib/contracts/HeadTail';
import { initPWCore } from '../lib/portalwallet/pw';
import './app.scss';

// import PolyjuiceHttpProvider from '../lib/polyjuice/polyjuice_provider.min.js';

async function createWeb3() {
    // Modern dapp browsers...
    if ((window as any).ethereum) {
        // const godwoken_rpc_url = 'http://localhost:8024';
        // const provider_config = {
        //     godwoken: {
        //         rollup_type_hash:
        //             '0xf70aa98a96fba847185be1b58c1d1e3cae7ad91f971eecc5749799d5e72939f0',
        //         eth_account_lock: {
        //             code_hash: '0xeeb39042bd7a1907e35823438db35f0a67fd495464abd0d183220e1ee8dda009',
        //             hash_type: 'type'
        //         }
        //     }
        // };
        // const provider = new PolyjuiceHttpProvider(godwoken_rpc_url, provider_config);
        const web3 = new Web3(Web3.givenProvider);

        try {
            // Request account access if needed
            await (window as any).ethereum.enable();
        } catch (error) {
            // User denied account access...
        }

        return web3;
    }

    console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
    return null;
}

const SUDT_IT = 1;
const SECRET = 'THIS_IS_SECRET';

// true = head, false = tail
type CHOICE_TYPE = boolean;
const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

export function App() {
    const [web3, setWeb3] = useState<Web3>(null);
    const [contract, setContract] = useState<HeadTailPolyjuice>();
    const [accounts, setAccounts] = useState<string[]>();
    const [l1Balance, setL1Balance] = useState<Amount>();
    const [l2Balance, setL2Balance] = useState<bigint>();
    const [godwokenAccountId, setGodwokenAccountId] = useState<number>();
    const [firstUserChoice, setFirstUserChoice] = useState<CHOICE_TYPE>(true);
    const [secondUserChoice, setSecondUserChoice] = useState<CHOICE_TYPE>(true);
    const [revealedChoice, setRevealedChoice] = useState<CHOICE_TYPE>(true);
    const [depositAmount, setDepositAmount] = useState<string>('777');
    const [existingContractIdInputValue, setExistingContractIdInputValue] = useState<string>();
    const [firstUserAddress, setFirstUserAddress] = useState<string | undefined>();
    const [secondUserAddress, setSecondUserAddress] = useState<string | undefined>();
    const [contractBalance, setContractBalance] = useState<bigint | undefined>();
    const [deployedContractDepositAmount, setDeployedContractDepositAmount] = useState<string>();
    const [chainId, setChainId] = useState<number | undefined>();

    const account = accounts?.[0];

    async function deployContract() {
        // const { signedChoiceHash, choiceHash, v, r, s } = await createChoiceSignature(
        //     account,
        //     firstUserChoice,
        //     SECRET,
        //     web3
        // );
        // console.log({
        //     signedChoiceHash,
        //     choiceHash,
        //     v,
        //     r,
        //     s
        // });
        // const _contract = new HeadTailPolyjuice(web3);
        // await _contract.deploy(signedChoiceHash, depositAmount, godwokenAccountId);
        // setContract(_contract);
        // setDeployedContractDepositAmount(depositAmount);
    }

    async function verifySignature() {
        // const web3Ethereum = new Web3((window as any).ethereum);

        const { signedChoiceHash } = await createChoiceSignature(
            account,
            firstUserChoice,
            SECRET,
            chainId,
            contract.address, // @TODO contract address
            web3
        );

        console.log({
            domainSeparatorFromContract: await contract.contract.methods.domainSeparator().call(),
            domainSeparatorFromJS: await domainSeparator(
                'HeadTail',
                '1',
                chainId,
                contract.address
            ),
            address: contract.address
        });

        const data = await contract.verify(firstUserChoice, SECRET, signedChoiceHash, account);

        console.log('verifySignature', {
            data
        });

        return data;
    }

    async function getUserOneAddress() {
        const value = await contract.getUserOneAddress(account);

        setFirstUserAddress(value);
    }

    async function getUserTwoAddress() {
        const value = await contract.getUserTwoAddress(account);

        setSecondUserAddress(value);
    }

    async function getStake(_contract: HeadTailPolyjuice = contract) {
        const value = await _contract.getStake(account);

        setDeployedContractDepositAmount(value.toString());
    }

    const onFirstUserChoiceChange: React.ChangeEventHandler<HTMLSelectElement> = event => {
        setFirstUserChoice(event.target.value === 'head');
    };

    const onSecondUserChoiceChange: React.ChangeEventHandler<HTMLSelectElement> = event => {
        setSecondUserChoice(event.target.value === 'head');
    };

    const onRevealedChoiceChange: React.ChangeEventHandler<HTMLSelectElement> = event => {
        setRevealedChoice(event.target.value === 'head');
    };

    async function getContractBalance(_contract = contract) {
        // const contractAccountId = await getAccountIdByEthAddress(_contract.contractAccountId);
        // setContractBalance(await getBalanceByEthAddress(SUDT_IT, _contract.contractAccountId));
    }

    async function setExistingContractId(contractAccountId: string) {
        const _contract = new HeadTailPolyjuice(web3);
        _contract.useDeployed(contractAccountId);

        setContract(_contract);
        await getStake(_contract);
        await getContractBalance(_contract);
        setFirstUserAddress(undefined);
        setSecondUserAddress(undefined);
        setChainId(parseInt(await _contract.contract.methods.getChainId().call(), 10));
    }

    async function depositUserOne() {
        const web3Ethereum = new Web3((window as any).ethereum);

        const { signedChoiceHash, choiceHash } = await createChoiceSignature(
            account,
            firstUserChoice,
            SECRET,
            chainId,
            contract.address,
            web3Ethereum
        );

        console.log({
            signedChoiceHash,
            choiceHash
        });

        await contract.depositUserOne(signedChoiceHash, depositAmount, account);
    }

    async function guess() {
        await contract.depositUserTwo(secondUserChoice, deployedContractDepositAmount, account);
    }

    async function revealUserOneChoice() {
        await contract.revealUserOneChoice(secondUserChoice, SECRET, account);
    }

    useEffect(() => {
        if (web3) {
            return;
        }

        (async () => {
            const _web3 = await createWeb3();
            setWeb3(_web3);

            const _accounts = [(window as any).ethereum.selectedAddress];
            setAccounts(_accounts);
            console.log({ _accounts });

            // const { pwcore, balance: _balance } = await initPWCore();
            // console.log(pwcore);

            // setL1Balance(_balance);

            if (_accounts && _accounts[0]) {
                console.log('call eth.getBalance');
                const _l2Balance = BigInt(await _web3.eth.getBalance(_accounts[0]));
                setL2Balance(_l2Balance);
                console.log('l2 balance', { _l2Balance });
            }
        })();
    });

    const LoadingIndicator = () => <span className="rotating-icon">⚙️</span>;

    return (
        <div>
            <div>
                Your ETH address:{' '}
                <b>
                    {accounts?.[0]}
                    {/* (L1 balance: {l1Balance?.toString() || <LoadingIndicator />}{' '} */}
                    {/* CKB) */}
                </b>{' '}
                |&nbsp;
                <b>
                    L2 balance:{' '}
                    {l2Balance ? (l2Balance / 10n ** 8n).toString() : <LoadingIndicator />} CKB
                </b>
            </div>
            Deployed contract address: <b>{contract?.address}</b>{' '}
            {deployedContractDepositAmount && (
                <> | Deposit amount: {deployedContractDepositAmount} Shannons</>
            )}
            {contractBalance && <> | Contract balance: {contractBalance.toString()} Shannons</>}
            <br />
            <br />
            Values below are: choice, deposit amount (in Shannons [1/10^8 CKB]), secret string.
            <br />
            <br />
            <select onChange={onFirstUserChoiceChange}>
                <option value="head">Head</option>
                <option value="tail">Tail</option>
            </select>
            <input value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
            <input value={SECRET} disabled />
            <br />
            <br />
            <p>
                The button below will deploy a smart-contract where two players can play against
                each other and win staked asset. The first player needs to deploy a contract and
                pick Head or Tail. Alongside with the choice, the first player also deposits a
                specified amount of tokens. The second player will have to deposit exactly the same
                amount of tokens when he tries to guess the choice. Whoever wins, gets all deposited
                tokens.
            </p>
            <button onClick={deployContract} disabled={!l2Balance}>
                Deploy contract
            </button>
            &nbsp;or&nbsp;
            <input
                placeholder="Existing contract id"
                onChange={e => setExistingContractIdInputValue(e.target.value)}
            />
            <button
                disabled={!existingContractIdInputValue || !l2Balance}
                onClick={() => setExistingContractId(existingContractIdInputValue)}
            >
                Use existing contract
            </button>
            <br />
            <br />
            <button onClick={getUserOneAddress} disabled={!contract}>
                Get first user address
            </button>
            {firstUserAddress ? <>&nbsp;&nbsp;Address: {firstUserAddress.toString()}</> : null}
            <br />
            <br />
            <button onClick={getUserTwoAddress} disabled={!contract}>
                Get second user address
            </button>
            {secondUserAddress ? <>&nbsp;&nbsp;Address: {secondUserAddress.toString()}</> : null}
            <br />
            <br />
            <button
                onClick={depositUserOne}
                disabled={
                    !contract ||
                    Boolean(
                        firstUserAddress &&
                            firstUserAddress !== '0' &&
                            firstUserAddress !== EMPTY_ADDRESS
                    )
                }
            >
                Deposit user one
            </button>
            <br />
            <br />
            <button
                onClick={guess}
                disabled={
                    !contract || Boolean(secondUserAddress && secondUserAddress !== EMPTY_ADDRESS)
                }
            >
                Guess (as second user)
            </button>
            <select
                onChange={onSecondUserChoiceChange}
                disabled={!contract || Boolean(secondUserAddress)}
            >
                <option value="head">Head</option>
                <option value="tail">Tail</option>
            </select>
            <br />
            <p>Second user needs to be different than the user who created the bet.</p>
            <hr />
            <button onClick={revealUserOneChoice} disabled={!contract}>
                Submit original choice and settle (as first user)
            </button>
            <select onChange={onRevealedChoiceChange} disabled={!contract}>
                <option value="head">Head</option>
                <option value="tail">Tail</option>
            </select>
            <input value={SECRET} disabled />
            <br />
            <br />
            <hr />
            <button onClick={verifySignature}>Test verifying signature</button>
            <hr />
            The above function submits the original encrypted choice to the smart-contract and the
            winner is selected based on the correctness of the second user guess. First user needs
            to submit his choice alongside the secret random string (security reasons).
            <br />
            <br />
            <br />
            <hr />
            The contract is deployed on Nervos Layer 2 - Godwoken + Polyjuice. After each
            transaction you might need to wait up to 120 seconds for the status to be reflected.
        </div>
    );
}