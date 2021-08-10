import Web3 from 'web3';
import * as ElectionJSON from '../../../build/contracts/Election.json';
import { Election } from '../../types/Election';

const DEFAULT_SEND_OPTIONS = {
    gas: 6000000
};

export class ElectionWrapper {
    web3: Web3;

    contract: Election;

    address: string;

    constructor(web3: Web3) {
        this.web3 = web3;
        this.contract = new web3.eth.Contract(ElectionJSON.abi as any) as any;
    }

    get isDeployed() {
        return Boolean(this.address);
    }

    async getCandidate(value: number, fromAddress: string) {
        const data = await this.contract.methods.candidates(value).call({ from: fromAddress });
        console.log("getCandidate");
        console.log(data);
        return 200;
        //return data[value];
        //return parseInt(data, 10);
    }

    async getCandidatesCount(fromAddress: string) {
        const data = await this.contract.methods.candidatesCount().call({ from: fromAddress });
        console.log("getCandidatesCount");
        console.log(data);
        return data;
    }

    async vote(value: number, fromAddress: string) {
        const tx = await this.contract.methods.vote(value).send({
            ...DEFAULT_SEND_OPTIONS,
            from: fromAddress
        });

        return tx;
    }

    async deploy(fromAddress: string) {
        const deployTx = await (this.contract
            .deploy({
                data: ElectionJSON.bytecode,
                arguments: []
            })
            .send({
                ...DEFAULT_SEND_OPTIONS,
                from: fromAddress,
                to: '0x0000000000000000000000000000000000000000'
            } as any) as any);

        this.useDeployed(deployTx.contractAddress);

        return deployTx.transactionHash;
    }

    useDeployed(contractAddress: string) {
        this.address = contractAddress;
        this.contract.options.address = contractAddress;
    }
}

