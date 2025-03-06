import React, { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";

interface ThemeContextType {
	theme: "light" | "dark";
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
	theme: "light",
	toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: PropsWithChildren) => {
	const [theme, setTheme] = useState<"light" | "dark">("light");

	const toggleTheme = () => {
		setTheme((prevTheme) => {
			const newTheme = prevTheme === "light" ? "dark" : "light";
			document.documentElement.setAttribute("data-theme", newTheme);
			return newTheme;
		});
	};

	useEffect(() => {
		// 检查系统偏好
		const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		const initialTheme = prefersDark ? "dark" : "light";
		setTheme(initialTheme);
		document.documentElement.setAttribute("data-theme", initialTheme);
	}, []);

	return (
		<ThemeContext.Provider value={{ theme, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	);
};

export const useTheme = () => useContext(ThemeContext);