import ReactPlayground from "./ReactPlayground/index";
import "./App.scss";
import { PlaygroundProvider } from "./ReactPlayground/PlaygroundContext";
function App() {
	return (
		<PlaygroundProvider>
			<ReactPlayground />
		</PlaygroundProvider>
	);
}

export default App;
