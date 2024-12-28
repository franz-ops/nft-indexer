import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  Image,
  Input,
  SimpleGrid,
  Text,
  Spinner
} from '@chakra-ui/react';
import { Alchemy, Network } from 'alchemy-sdk';
import { useState, useEffect } from 'react';

function App() {
  const [userAddress, setUserAddress] = useState('');
  const [results, setResults] = useState([]);
  const [hasQueried, setHasQueried] = useState(false);
  const [tokenDataObjects, setTokenDataObjects] = useState([]);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);


  function sanitizeIpfsUrl(url) {
    if (url.startsWith('ipfs://') ) {
      return url.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
    }
    if (url.startsWith('https://ipfs.io/ipfs/') ) {
      return url.replace('https://ipfs.io/ipfs/', 'https://gateway.pinata.cloud/ipfs/');
    }
    return url;
  }

  async function connectWallet() {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts'});
        setUserAddress(accounts[0]);
      }
      catch (error) {
        console.log(error);
      }
    }
    setIsWalletConnected(true);
    //getNFTsForOwner();
  }

// Funzione helper per implementare retries
async function fetchWithRetries(fetchFunction, retries = 3, delay = 1000) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fetchFunction();
    } catch (error) {
      if (attempt < retries - 1) {
        console.warn(`Retrying... (${attempt + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay * (attempt + 1))); // Exponential backoff
      } else {
        throw error; // Throw error after exhausting retries
      }
    }
  }
}
  
useEffect(() => {
  if (!userAddress) return; // Esegui l'effetto solo se userAddress è valorizzato

  const fetchNFTs = async () => {
    const config = {
      apiKey: '',
      network: Network.ETH_MAINNET,
    };

    const alchemy = new Alchemy(config);
    setIsLoading(true);

    try {
      // Fetch NFTs owned by the user
      const data = await fetchWithRetries(() => alchemy.nft.getNftsForOwner(userAddress));
      setResults(data);

      const tokenDataPromises = data.ownedNfts.map((nft) =>
        fetchWithRetries(() =>
          alchemy.nft.getNftMetadata(nft.contract.address, nft.tokenId, {})
        )
      );

      setTokenDataObjects(await Promise.all(tokenDataPromises));
      setHasQueried(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch NFT data:', error);
      setIsLoading(false);
    }
  };

  fetchNFTs();
}, [userAddress]);


  return (
    <Box w="100vw">
        {
        isWalletConnected && (
          <Flex
            position={"absolute"}
            top={4}
            right={4}
            bg={'gray.700'}
            color={'white'}
            p={'2%'}
            borderRadius={'md'}
            alignItems={'center'}
            justifyContent="center"
            flexDirection={'column'}
          >
          <Text fontSize="sm" fontWeight="bold" mr={10}>
            {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
          </Text>
          <Button
            size="sm"
            color="red"
            onClick={() => (setIsWalletConnected(false), setHasQueried(false), setTokenDataObjects([]), setUserAddress(''))} 
          >
            Disconnect
          </Button>

          </Flex>
        )
      }

      <Center>
        <Flex
          alignItems={'center'}
          justifyContent="center"
          flexDirection={'column'}
        >
          <Heading mb={0} fontSize={36}>
            NFT Indexer 🖼
          </Heading>
        </Flex>
      </Center>

      <Flex
        w="100%"
        flexDirection="column"
        alignItems="center"
        justifyContent={'center'}
      >
        
        { !hasQueried ? (
          <Box>
            <Text
              textAlign={'center'}>
            Plug in an address and this website will return all of its NFTs!
            </Text>
            <Heading mt={42} textAlign={'center'}>Get all the ERC-721 tokens of this address:</Heading>
            
            <Input
              onChange={(e) => setUserAddress(e.target.value)}
              color="black"
              w="600px"
              textAlign="center"
              p={4}
              bgColor="white"
              fontSize={24}
            />
            <Flex
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              >
              <Button fontSize={20} onClick={() => (setIsLoading(true), setHasQueried(true)) } mt={36} bgColor="blue">
                Fetch NFTs
              </Button>
              <Heading mt={'3%'} fontSize={16}> OR </Heading>
              <Button fontSize={20} onClick={() => (setIsLoading(true), setHasQueried(true), connectWallet())} mt={18} bgColor="orange">
                Connect Wallet
              </Button>
            </Flex>

            </Box>
        ) : (
          
          isLoading ? (<Box mt={'1%'} display={'flex'} flexDirection={'column'} alignItems="center" justifyContent="center"><Heading fontSize={18}>Loading...</Heading><Spinner size="lg" boxSize="20"  /></Box>) : (
          <Box>
            <Heading display={'flex'} justifyContent={'center'} mt={'4%'}>Here are your NFTs:</Heading>
            { !isWalletConnected && (
              <Box display='flex' justifyContent={'flex-end'}><Button
              mr={'2%'}
              mb={'2%'}
              size="sm"
              color="green"
              onClick={() => ( setHasQueried(false), setTokenDataObjects([]), setUserAddress(''))} 
              >
              New Fetch NFTs
            </Button></Box>
            )}

          <SimpleGrid w={'90vw'} columns={4} spacing={24}>
            {results.ownedNfts.map((e, i) => {
              return (
                <Flex
                  flexDir={'column'}
                  color="white"
                  bg="blue"
                  w={'20vw'}
                  key={e.id}
                >
                  <Box>
                    <b>Name:</b>{' '}
                    {tokenDataObjects[i].title?.length === 0
                      ? 'No Name'
                      : tokenDataObjects[i].title}
                  </Box>
                  <Image
                    src={
                      tokenDataObjects[i]?.rawMetadata?.image ? 
                      sanitizeIpfsUrl(tokenDataObjects[i]?.rawMetadata?.image) :
                      'https://via.placeholder.com/200'
                    }
                    alt={'Image'}
                  />
                </Flex>
              );
            })}
          </SimpleGrid>
          </Box>
          )
        )}

      </Flex>
    </Box>
  );
}

export default App;