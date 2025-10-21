import { MessagingClientProvider } from "./providers/MessagingClientProvider";
import { SessionKeyProvider } from "./providers/SessionKeyProvider";
import Init from "./components/Init";

function App() {
  return (
    <SessionKeyProvider>
      <MessagingClientProvider>
        <Init />
      </MessagingClientProvider>
    </SessionKeyProvider>
  );
}

export default App;
