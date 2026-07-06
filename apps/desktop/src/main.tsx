import { DirectionProvider } from "@base-ui/react/direction-provider";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Toaster } from "./components/Toaster";
import "./components/toast.css";
import "./index.css";
import { resolveDirection } from "./lib/direction";
import { initTheme } from "./lib/theme";

// Mirror the whole app for RTL UI locales. `document.dir` drives CSS logical
// properties and text alignment; DirectionProvider aligns Base UI popovers,
// menus, and tooltips to match.
const direction = resolveDirection();
document.documentElement.dir = direction;

// Apply the saved light/dark/system theme before first paint to avoid a flash.
initTheme();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<DirectionProvider direction={direction}>
			<App />
			<Toaster />
		</DirectionProvider>
	</React.StrictMode>,
);
