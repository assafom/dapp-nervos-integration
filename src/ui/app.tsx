/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import { ToastContainer, toast } from 'react-toastify';
import './app.scss';
import 'react-toastify/dist/ReactToastify.css';
import { PolyjuiceHttpProvider } from '@polyjuice-provider/web3';
import { AddressTranslator } from 'nervos-godwoken-integration';

import { ElectionWrapper } from '../lib/contracts/ElectionWrapper';
import { CONFIG } from '../config';
import { SudtERC20ProxyWrapper } from '../lib/contracts/SudtERC20ProxyWrapper';

async function createWeb3() {
    // Modern dapp browsers...
    if ((window as any).ethereum) {
        const godwokenRpcUrl = CONFIG.WEB3_PROVIDER_URL;
        const providerConfig = {
            rollupTypeHash: CONFIG.ROLLUP_TYPE_HASH,
            ethAccountLockCodeHash: CONFIG.ETH_ACCOUNT_LOCK_CODE_HASH,
            web3Url: godwokenRpcUrl
        };

        const provider = new PolyjuiceHttpProvider(godwokenRpcUrl, providerConfig);
        const web3 = new Web3(provider || Web3.givenProvider);

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

export function App() {
    const [web3, setWeb3] = useState<Web3>(null);
    const [contract, setContract] = useState<ElectionWrapper>();
    const [ethProxyContract, setEthProxyContract] = useState<SudtERC20ProxyWrapper>();
    const [accounts, setAccounts] = useState<string[]>();
    const [l2Balance, setL2Balance] = useState<bigint>();
    const [polyjuiceBalance, setPolyjuiceBalance] = useState<number>();
    const [existingContractIdInputValue, setExistingContractIdInputValue] = useState<string>();
    const [storedValue, setStoredValue] = useState<number | undefined>();
    const [deployTxHash, setDeployTxHash] = useState<string | undefined>();
    const [polyjuiceAddress, setPolyjuiceAddress] = useState<string | undefined>();
    const [layer1DepositAddress, setLayer1DepositAddress] = useState<string | undefined>();
    const [transactionInProgress, setTransactionInProgress] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const toastId = React.useRef(null);
    const [newStoredNumberInputValue, setNewStoredNumberInputValue] = useState<
        number | undefined
    >();
    const [candidates, setCandidates] = useState<object[]>();
    const [hasVoted, setHasVoted] = useState(false);
    const [voteValue, setVoteValue] = useState<number | undefined>();

    useEffect(() => {
        if (accounts?.[0]) {
            const addressTranslator = new AddressTranslator();
            setPolyjuiceAddress(addressTranslator.ethAddressToGodwokenShortAddress(accounts?.[0]));
        } else {
            setPolyjuiceAddress(undefined);
        }
    }, [accounts?.[0]]);

    useEffect(() => {
        if (transactionInProgress && !toastId.current) {
            toastId.current = toast.info(
                'Transaction in progress. Confirm MetaMask signing dialog and please wait...',
                {
                    position: 'top-right',
                    autoClose: false,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    closeButton: false
                }
            );
        } else if (!transactionInProgress && toastId.current) {
            toast.dismiss(toastId.current);
            toastId.current = null;
        }
    }, [transactionInProgress, toastId.current]);

    useEffect(() => {
        if (loadingData && !toastId.current) {
            toastId.current = toast.info(
                'Loading data. Please wait...',
                {
                    position: 'top-right',
                    autoClose: false,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    closeButton: false
                }
            );
        } else if (!loadingData && toastId.current) {
            toast.dismiss(toastId.current);
            toastId.current = null;
        }
    }, [loadingData, toastId.current]);

    const account = accounts?.[0];

    async function deployContract() {
        const _contract = new ElectionWrapper(web3);

        try {
            setDeployTxHash(undefined);
            setTransactionInProgress(true);

            const transactionHash = await _contract.deploy(account);

            setDeployTxHash(transactionHash);
            setExistingContractAddress(_contract.address);
            console.log(transactionHash);
            console.log(_contract.address);
            toast(
                'Successfully deployed a smart-contract. You can now proceed to get or set the value in a smart contract.',
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error sending your transaction. Please check developer console.'
            );
        } finally {
            setTransactionInProgress(false);
        }
    }

    async function getCandidate(id: number) {
        const value = await contract.getCandidate(id, account);
        toast('Successfully read latest stored value.', { type: 'success' });

        setStoredValue(4);
    }

    async function setExistingContractAddress(contractAddress: string) {
        const _contract = new ElectionWrapper(web3);
        const _ckEthContract = new SudtERC20ProxyWrapper(web3);
        const addressTranslator = new AddressTranslator();

        try {
            setLoadingData(true);
            _contract.useDeployed(contractAddress.trim());

            setContract(_contract);
            setStoredValue(undefined);

            _ckEthContract.useDeployed('0x0D8b2881Cc4b800A3CD433F8441A202c8DB684fD');

            setEthProxyContract(_ckEthContract);
            const _ckEthBalance = await _ckEthContract.balanceOf(polyjuiceAddress, account);
            setPolyjuiceBalance(_ckEthBalance)
            const _userDepAddress = await addressTranslator.getLayer2DepositAddress(web3, account);
            setLayer1DepositAddress(_userDepAddress.addressString);

            const _hasVoted = await _contract.hasVoted(polyjuiceAddress, account);
            console.log(_hasVoted);
            setHasVoted(_hasVoted);

            const len = await _contract.getCandidatesCount(account);
            const _candidates = [];
            for (let i = 1 ; i <= len; i++) {   
                const _curr = await _contract.getCandidate(i, account);
                const pjAddress = addressTranslator.ethAddressToGodwokenShortAddress(_curr["donations"]);
                const depositAddress = await addressTranslator.getLayer2DepositAddress(web3, _curr["donations"]);
                _curr["donationsAmount"] =  await _ckEthContract.balanceOf(pjAddress, account);
                _curr["donations"] = depositAddress.addressString;
                _candidates.push(_curr);
            }
            setVoteValue(1);
            console.log("om");
            console.log(_candidates);
            setCandidates(_candidates);
            const _l2Balance = BigInt(await web3.eth.getBalance(account));
            setL2Balance(_l2Balance);
            toast(
                'Successfully loaded data.',
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error loading data. Please check developer console.'
            );
        } finally {
            setLoadingData(false);
        }
        
        //getCandidates();
        
    }

    async function setVote() {
        try {
            setTransactionInProgress(true);
            console.log(voteValue);
            await contract.vote(voteValue, account);
            toast(
                'Successfully voted. You can click the button to refresh the data.',
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error sending your transaction. Please check developer console.'
            );
        } finally {
            setTransactionInProgress(false);
        }
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

            if (_accounts && _accounts[0]) {
                const _l2Balance = BigInt(await _web3.eth.getBalance(_accounts[0]));
                setL2Balance(_l2Balance);
            }
        })();
    });

    const LoadingIndicator = () => <span className="rotating-icon">⚙️</span>;

    const CandidatesTable = () => (
        <>
            <b>Candidates</b>
            <br />
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Name</th>
                  <th scope="col">Votes</th>
                  <th scope="col">Donations balance</th>
                </tr>
              </thead>
              <tbody id="candidatesResults">
              { candidates?.length>0?candidates.map(element=><tr><th>{element["id"]}</th><td>{element["name"]}</td><td>{element["voteCount"]}</td><td>{element["donationsAmount"]}</td></tr>):'no'}


                  
              </tbody>
            </table>
            <br></br>
            {!hasVoted? <VoteDropdown /> : <ThanksForVoting />}
            <hr />
            <div>
                <b>Donations</b>
                <br />
                To donate Ether to your candidate, open <a href="https://force-bridge-test.ckbapp.dev/bridge/Ethereum/Nervos?xchain-asset=0x0000000000000000000000000000000000000000">Force Bridge</a>,
                <br />and at the Recipient field, use the Candidate's deposit donation from below:
                <br /><br />
                { candidates?.length>0?candidates.map(element=><div className="scrollable"><b>{element["name"]}:</b> {element["donations"]}<br/></div>):'no'}
            </div>
            <hr />
        </>
    );

    const VoteDropdown = () => (
        <>
            <form>
              <div>
                <label>Vote for candidate: </label>
                <select id="candidatesSelect" onChange={e => setVoteValue(e.target.value)}>
                    { candidates?.length>0?candidates.map(element=><option value={element["id"]}>{element["name"]}</option>):'no'}
                </select>
              </div>
              <br /><button type="button" onClick={setVote}>Vote</button>
            </form>
        </>
    );

    const ThanksForVoting = () => (
    <>
        <div id="alreadyVoted"><p>Your vote has been registered. Thanks for voting!</p></div>
    </>
    );

    return (
        <div>

            <hr />
            <button
                onClick={() => setExistingContractAddress("0xd5A32a5c1d213bb19702DAacac642899746bEa1D")}
            >
                {candidates?.length>0 ? 'Reload data' : 'Load data'}
            </button>
            <hr />

            {candidates?.length>0 ? <CandidatesTable /> : null}

            Your ETH address: <b>{accounts?.[0]}</b>
            <br />
            <br />
            Your Polyjuice address: <b>{polyjuiceAddress || ' - '}</b>
            <br />
            <br />
            Your Polyjuice ckEth balance: <b>{polyjuiceBalance || ' (load data first...) '}</b>
            <br />
            <br />
            Your layer 2 deposit address on layer 1: <div className="scrollable">{layer1DepositAddress || ' (load data first...) '}</div>
            <hr />
            The contract is deployed on Nervos Layer 2 - Godwoken + Polyjuice. After each
            transaction you might need to wait up to 120 seconds for the status to be reflected.
            <ToastContainer />
        </div>
    );
}

