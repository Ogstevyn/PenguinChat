import { useEffect } from 'react';
import { useSuiClientContext } from '@mysten/dapp-kit';
import { isEnokiNetwork, registerEnokiWallets } from '@mysten/enoki';

export default function RegisterEnokiWallets() {
	const { client, network } = useSuiClientContext();

	useEffect(() => {
		if (!isEnokiNetwork(network)) return;
		const {unregister} = registerEnokiWallets({
			// @ts-ignore
			client,
			network,
			apiKey: import.meta.env.VITE_ENOKI_PUBLIC_KEY,
			providers: {
				google: { clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID },
			},
		});

		return unregister;
	}, [client, network]);

	return null;
}
