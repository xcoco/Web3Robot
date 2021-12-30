const Web3 = require('web3');
require("dotenv").config();
const fs = require('fs');
const readline = require('readline');
const https = require('https')
const galaxyABI = require('./ABI/galaxy.json');
const ERC1155ABI = require('./ABI/erc1155-abi.json');
const rpcUrl = 'https://bsc-dataseed1.binance.org/';

const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));

const addresses = {
    ALPACAFINANCE:'0xd7D069493685A581d27824Fc46EdA46B7EfC0063',
    GLAXYNFT:'0x835f22b4280aaf357d12dbf03721651b3a8b0167',
    SENDNFT:'0xe85d7B8f4c0C13806E158a1c9D7Dcb33140cdc46'
}


const signpayload = "2021 NFT Treasure Hunt on Project Galaxy\n" +
    "\n" +
    "Depositing with Alpaca Finance!!\n" +
    "\n" +
    "Users who deposit any amount of tokens that Alpaca supports in the Alpaca Lend Page (https://app.alpacafinance.org/lend) are eligible to claim Alpaca Christmas NFT.\n" +
    "\n" +
    "The tutorial is here: https://www.youtube.com/watch?v=KmNa6fPk6Sc\n" +
    "\n";

const _promise = async(privateKey, from, toaddr, encodeABI, sendcount = 0) =>{
    try
    {
        let nounce = await web3.eth.getTransactionCount(from);
        let gasPrice = await web3.eth.getGasPrice();
        var gaslimit = 420000;
        const amount = web3.utils.toWei(sendcount.toString(), 'ether');
        let tx = {
            from: from,
            value:amount,
            nonce:web3.utils.toHex(nounce),
            gasPrice:web3.utils.toHex(gasPrice),
            gasLimit:web3.utils.toHex(gaslimit),
            to:toaddr,
            data:encodeABI
        }
        return await web3.eth.accounts.signTransaction(tx, privateKey).then(signed =>{
            try{
                return new Promise(async (resolve, reject) => {
                    web3.eth.sendSignedTransaction(signed.rawTransaction).on('receipt', receipt => {
                        resolve(receipt.status);
                    });
                });
            }
            catch (e){
                console.log(e)
                return false
            }
        });
    }
    catch (error)
    {
        console.log(error);
    }
    return false
}


const Deposit = async (currentAcount, tokenaddr, amount) => {
    const contract = new web3.eth.Contract(galaxyABI, tokenaddr);
    const encodeabi = contract.methods.deposit( web3.utils.toWei(amount.toString(), 'ether')).encodeABI();
    return await _promise(currentAcount.privateKey, currentAcount.address, tokenaddr, encodeabi, amount);
}

const Claim = async (currentAcount, tokenaddr, cid, nftCoreAddress, verifyid, signature) =>{
    const contract = new web3.eth.Contract(galaxyABI, tokenaddr);
    const encodeabi = await contract.methods.claim(web3.utils.toTwosComplement(cid), nftCoreAddress, web3.utils.toTwosComplement(verifyid), web3.utils.toTwosComplement(0), signature).encodeABI();
    return await _promise(currentAcount.privateKey, currentAcount.address, tokenaddr, encodeabi);
}

function doRequest(options, data) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            res.setEncoding('utf8');
            let responseBody = '';

            res.on('data', (chunk) => {
                responseBody += chunk;
            });

            res.on('end', () => {
                resolve(JSON.parse(responseBody));
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.write(data)
        req.end();
    });
}

const GalaxyHttpPost = async(data) => {
    const options = {
        hostname: 'graphigo.prd.galaxy.eco',
        port: 443,
        path: '/query',
        method: 'POST',
        headers: {
            'Content-Length': data.length,
            "Connection": "keep-alive",
            "accept": "*/*",
            "content-type": "application/json",
            "authorization": "null",
            "sec-ch-ua-mobile": "?0",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
            "sec-ch-ua-platform": "\"Windows\"",
            "Origin": "https://galaxy.eco",
            "Sec-Fetch-Site": "same-site",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Referer": "https://galaxy.eco/",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "zh,en;q=0.9,zh-CN;q=0.8",
        }
    }

    return await doRequest(options, data);
}

const GetinfoBySignature = async(address, signature) =>{
    const data = JSON.stringify({
        "operationName": "PrepareParticipate",
        "variables": {
            "input": {
                "signature": signature,
                "campaignID": "GCJC8UUM9N",
                "address": address,
                "mintCount": 1,
                "chain": "BSC"
            }
        },
        "query": "mutation PrepareParticipate($input: PrepareParticipateInput!) {\n  prepareParticipate(input: $input) {\n    allow\n    disallowReason\n    signature\n    mintFuncInfo {\n      funcName\n      nftCoreAddress\n      verifyIDs\n      powahs\n      cap\n      __typename\n    }\n    extLinkResp {\n      success\n      data\n      error\n      __typename\n    }\n    metaTxResp {\n      metaSig2\n      autoTaskUrl\n      metaSpaceAddr\n      forwarderAddr\n      __typename\n    }\n    __typename\n  }\n}\n"
    })
    return await GalaxyHttpPost(data);
}

const GetAccountNFTInfo = async(address)=>{
    const data = JSON.stringify({
        "operationName": "Campaign",
        "variables": {
            "address": address,
            "id": "GCJC8UUM9N"
        },
        "query": "query Campaign($id: ID!, $address: String!) {\n  campaign(id: $id) {\n    id\n    numberID\n    name\n    cap\n    info\n    useCred\n    formula\n    creator\n    creds {\n      id\n      name\n      type\n      referenceLink\n      staticEligible(value: $address)\n      subgraph {\n        endpoint\n        query\n        expression\n        eligible(address: $address)\n        __typename\n      }\n      __typename\n    }\n    numNFTMinted\n    thumbnail\n    gasType\n    createdAt\n    requirementInfo\n    description\n    enableWhitelist\n    chain\n    startTime\n    requireEmail\n    requireUsername\n    childrenCampaigns {\n      id\n      cap\n      numberID\n      dao {\n        id\n        __typename\n      }\n      parentCampaign {\n        id\n        __typename\n      }\n      thumbnail\n      name\n      numNFTMinted\n      description\n      requirementInfo\n      startTime\n      chain\n      requireEmail\n      requireUsername\n      endTime\n      useCred\n      formula\n      creator\n      creds {\n        id\n        name\n        type\n        referenceLink\n        staticEligible(value: $address)\n        subgraph {\n          endpoint\n          query\n          expression\n          eligible(address: $address)\n          __typename\n        }\n        __typename\n      }\n      numNFTMinted\n      whitelistInfo(address: $address) {\n        address\n        maxCount\n        usedCount\n        __typename\n      }\n      gamification {\n        id\n        type\n        airdrop {\n          name\n          contractAddress\n          token {\n            address\n            icon\n            symbol\n            __typename\n          }\n          merkleTreeUrl\n          addressInfo(address: $address) {\n            index\n            amount {\n              amount\n              ether\n              __typename\n            }\n            proofs\n            __typename\n          }\n          __typename\n        }\n        nfts {\n          nft {\n            animationURL\n            treasureBack\n            category\n            powah\n            image\n            name\n            nftCore {\n              id\n              capable\n              chain\n              contractAddress\n              spaceStationAddress\n              __typename\n            }\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      whitelistSubgraph {\n        query\n        endpoint\n        expression\n        variable\n        __typename\n      }\n      __typename\n    }\n    whitelistInfo(address: $address) {\n      address\n      maxCount\n      usedCount\n      __typename\n    }\n    endTime\n    dao {\n      id\n      name\n      logo\n      alias\n      nftCores {\n        list {\n          capable\n          marketLink\n          contractAddress\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    gamification {\n      id\n      type\n      airdrop {\n        name\n        contractAddress\n        token {\n          address\n          icon\n          symbol\n          __typename\n        }\n        merkleTreeUrl\n        addressInfo(address: $address) {\n          index\n          amount {\n            amount\n            ether\n            __typename\n          }\n          proofs\n          __typename\n        }\n        __typename\n      }\n      nfts {\n        nft {\n          animationURL\n          category\n          powah\n          image\n          name\n          treasureBack\n          nftCore {\n            id\n            capable\n            chain\n            contractAddress\n            spaceStationAddress\n            name\n            symbol\n            dao {\n              id\n              name\n              logo\n              alias\n              __typename\n            }\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      forgeConfig {\n        minNFTCount\n        maxNFTCount\n        requiredNFTs {\n          nft {\n            category\n            powah\n            image\n            name\n            nftCore {\n              capable\n              contractAddress\n              spaceStationAddress\n              __typename\n            }\n            __typename\n          }\n          count\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    whitelistSubgraph {\n      query\n      endpoint\n      expression\n      variable\n      __typename\n    }\n    __typename\n  }\n}\n"
    });
    let result = await GalaxyHttpPost(data);
    return {maxcount:result.data.campaign.whitelistInfo.maxCount, usedcount:result.data.campaign.whitelistInfo.usedCount}
}
function sleep(ms) {
    return new Promise(resolve =>setTimeout(() =>resolve(), ms));
}

const GetAccountNFTCount = async(address) =>{
    const data = JSON.stringify({
        "operationName": "MyNFTs",
        "variables": {
            "address": address,
            "option": {
                "orderBy": "CreateTime",
                "order": "DESC",
                "first": 10
            }
        },
        "query": "query MyNFTs($address: String!, $option: ListNFTInput!) {\n  addressInfo(address: $address) {\n    nfts(option: $option) {\n      totalCount\n      pageInfo {\n        endCursor\n        __typename\n      }\n      list {\n        id\n        name\n        image\n        powah\n        category\n        treasureBack\n        animationURL\n        nftCore {\n          id\n          name\n          symbol\n          contractAddress\n          spaceStationAddress\n          dao {\n            id\n            name\n            logo\n            alias\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n"
    });
    let result = await GalaxyHttpPost(data);
    return {count:result.data.addressInfo.nfts.totalCount, list:result.data.addressInfo.nfts.list};
}

const Growingvegetables = async(privatekey) =>{
    let myAccountAddress = web3.eth.accounts.privateKeyToAccount(privatekey);
    let currentAcount = {
        address:myAccountAddress.address,
        privateKey:privatekey
    }
    console.log(currentAcount.address+" 开始处理");
    let userinfo = await GetAccountNFTInfo(currentAcount.address);
    let reget = false;
    let index = 0;
    if(userinfo.maxcount ===  userinfo.usedcount === 0)
    {
        console.log(myAccountAddress.address+" 开始羊驼质押 0.001 个币");
        let status = await Deposit(currentAcount, addresses.ALPACAFINANCE, 0.001);
        if(status)
        {
            console.log(myAccountAddress.address+" Deposit success");
            await sleep(20000);
            reget = true;
        }
        else
        {
            console.log(myAccountAddress.address+" Deposit fail");
            return;
        }
    }
    if(reget)
    {

        console.log(myAccountAddress.address+" 等待 羊驼质押完成Galaxy释放资格...");
        for (let index = 0; index < 180; index++)
        {
            userinfo = await GetAccountNFTInfo(currentAcount.address);
            if(userinfo.maxcount >  userinfo.usedcount)
            {
                console.log(myAccountAddress.address+" 羊驼质押完成 Galaxy已经释放资格");
                break;
            }
            await sleep(3000);
        }

        if(userinfo.maxcount <  userinfo.usedcount)
        {
            console.log(myAccountAddress.address+" 没有可以用来 Claim 的资格, 需要耐心等待Galaxy释放资格, 换个时间重试");
            return;
        }

    }
    console.log(myAccountAddress.address+" 最多可以 Claim "+(userinfo.maxcount-userinfo.usedcount)+" 个 已经 Claim "+userinfo.usedcount+" 个");
    if(userinfo.maxcount === userinfo.usedcount)
    {
        console.log(myAccountAddress.address+" 没有可以 Claim 的NFT");
    }
    else
    {
        //  签名
        let signature = await web3.eth.accounts.sign(signpayload, privatekey);
        let result = await GetinfoBySignature(currentAcount.address, signature.signature);
        let retsignature = result.data.prepareParticipate.signature;
        let verifyid = result.data.prepareParticipate.mintFuncInfo.verifyIDs[0];
        let nftCoreAddress = result.data.prepareParticipate.mintFuncInfo.nftCoreAddress;
        let cid = 0x24c; //羊驼的NFT 固定值
        status = await Claim(currentAcount, addresses.GLAXYNFT, cid, nftCoreAddress, verifyid, retsignature);
        if(status)
        {
            console.log(myAccountAddress.address+" Claim success");
        }
        else
        {
            console.log(myAccountAddress.address+" Claim fail");
        }
    }

    let myNft = await GetAccountNFTCount(currentAcount.address);
    for (let index = 0; index < myNft.count; index++)
    {
        console.log(currentAcount.address+" 已有 NFT id: "+myNft.list[index].id);
    }
}

const Collectvegetables = async(privatekey, toaddress)=>{
    let myAccountAddress = web3.eth.accounts.privateKeyToAccount(privatekey);
    let currentAcount = {
        address:myAccountAddress.address,
        privateKey:privatekey
    }
    console.log(currentAcount.address+" 开始处理");
    const contract = new web3.eth.Contract(ERC1155ABI, addresses.GLAXYNFT);
    let myNft = await GetAccountNFTCount(currentAcount.address);
    if(myNft.count <= 0)
    {
        console.log("没有菜可以收");
        return;
    }
    const encodeabi = contract.methods.safeTransferFrom(currentAcount.address,  toaddress, web3.utils.toTwosComplement(myNft.list[0].id), web3.utils.toTwosComplement(1), "0xa0").encodeABI();
    return await _promise(currentAcount.privateKey, currentAcount.address, addresses.SENDNFT, encodeabi, 0);
}

// 做一个号 大概需要 0.004 个 bnb 币
const main = async() =>{
    const rl = readline.createInterface({
        input: fs.createReadStream('./db/address.txt'),
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if(line.indexOf("#") !== -1)
        {
            break;
        }
        let privatekey = line.split("\t")[1];

        // 种菜
        Growingvegetables(privatekey);

        // 收菜
        // Collectvegetables(privatekey, "0xD0fC15B48Ad9AfdC5567C47D439783106D6c1F42");
    }
}


main();