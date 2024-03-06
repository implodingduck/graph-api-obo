
import { useState, useEffect } from 'react'
import { MsalProvider, AuthenticatedTemplate, useMsal, UnauthenticatedTemplate } from '@azure/msal-react';
import { loginRequest, silentRequest } from './authConfig';
import JsonView from '@uiw/react-json-view';

const MainContent = () => {
    const { instance } = useMsal();
    const activeAccount = instance.getActiveAccount();
    const [bearerToken, setBearerToken] = useState("")
    const [securename, setSecurename] = useState("")
    const [secureresponse, setSecureresponse] = useState("")
    const [graphresponse, setGraphresponse] = useState("{}")

    const handleLoginRedirect = () => {
        instance.loginRedirect(loginRequest).catch((error) => console.log(error));
    };

    const handleLogoutRedirect = () => {
        instance.logoutRedirect().catch((error) => console.log(error));
    };

    const handleGenerateBearerToken = async () => {
        await generateBearerToken();
    }

    const generateBearerToken = async () => {
        const response = await instance.acquireTokenSilent({
            ...silentRequest,
            account: activeAccount
        });
        console.log(response)
        let accessToken = response.accessToken;   
        setBearerToken(accessToken)
        return accessToken;
    }

    const handleCallSecure = async () => {
        let bearerToken = await generateBearerToken();
        const response = await fetch(`http://localhost:8000/secure?prompt=${securename}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${bearerToken}`
            }
        });
        setSecureresponse(await response.text());
    }

    const handleCallGraph = async () => {
        let bearerToken = await generateBearerToken();
        const response = await fetch(`http://localhost:8000/graph?prompt=${securename}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${bearerToken}`
            }
        });
        setGraphresponse(await response.text());
    }

    return (
        <div className="App">
            <AuthenticatedTemplate>
                {activeAccount ? (
                    <>
                    <div>Hello, {activeAccount.name}</div>
                    <button onClick={handleGenerateBearerToken}>Generate Bearer token</button>
                    <pre>{bearerToken}</pre>
                    <hr />
                    <input type="text" placeholder='enter a name' value={securename} onChange={(e) => { setSecurename(e.target.value)}} />
                    <button onClick={handleCallSecure}>Call Secure</button>
                    <button onClick={handleCallGraph}>Call Graph</button>
                    <pre>{JSON.stringify(secureresponse, null, 2)}</pre>
                    <div className='jsonresponse'>
                        <JsonView value={JSON.parse(graphresponse)} />
                    </div>
                    <hr />
                    
                    <button className="signOutButton" onClick={handleLogoutRedirect} variant="primary">Sign out</button>
                    <pre>{ JSON.stringify(activeAccount.idTokenClaims, null, 2) }</pre>
                    </>
                ) : null}
            </AuthenticatedTemplate>
            <UnauthenticatedTemplate>
                <button className="signInButton" onClick={handleLoginRedirect} variant="primary">
                    Sign up
                </button>
            </UnauthenticatedTemplate>
        </div>
    );
}

export default MainContent;