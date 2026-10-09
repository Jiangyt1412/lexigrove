export function NotebookDecor({ className = "" }: { className?: string }) {
  // # Small native pixel ornaments frame live text instead of covering the readable page.
  return (
    <div className={`notebook-decoration ${className}`} aria-hidden="true">
      <svg
        className="notebook-vine vine-left"
        viewBox="0 0 80 110"
        shapeRendering="crispEdges"
      >
        <path
          d="M65 2v28h-6v24h-7v20h-8v28h-4V72h8V51h7V28h5V2z"
          fill="#574e32"
        />
        <path
          d="M61 14H43V6H28v12h8v8h20v-4h5zM56 38H38V28H24v14h8v8h20zM48 65H31V54H13v12h8v9h22zM44 85H29V74H16v12h7v9h17z"
          fill="#325b3e"
        />
        <path
          d="M46 10h11v10H39v-5h-6v-5zM32 32h18v12H35v-5h-5zM20 57h22v12H26v-5h-6zM22 78h17v10H27v-5h-5z"
          fill="#779c4b"
        />
        <path
          d="M37 10h8v4h-8zM31 32h10v4H31zM20 57h12v4H20zM23 78h8v4h-8z"
          fill="#b7c76b"
        />
        <path
          d="M62 29h10v8H62zM55 53h12v9H55zM49 75h12v8H49z"
          fill="#62873f"
        />
      </svg>
      <svg
        className="notebook-vine vine-right"
        viewBox="0 0 80 110"
        shapeRendering="crispEdges"
      >
        <path
          d="M65 2v28h-6v24h-7v20h-8v28h-4V72h8V51h7V28h5V2z"
          fill="#574e32"
        />
        <path
          d="M61 14H43V6H28v12h8v8h20v-4h5zM56 38H38V28H24v14h8v8h20zM48 65H31V54H13v12h8v9h22z"
          fill="#325b3e"
        />
        <path
          d="M46 10h11v10H39v-5h-6v-5zM32 32h18v12H35v-5h-5zM20 57h22v12H26v-5h-6z"
          fill="#7e9c49"
        />
        <path d="M37 10h8v4h-8zM31 32h10v4H31zM20 57h12v4H20z" fill="#c0ce7a" />
      </svg>
      <svg
        className="notebook-lantern"
        viewBox="0 0 56 88"
        shapeRendering="crispEdges"
      >
        <path
          d="M26 0h4v24h-4zM20 18h16v6H20zM16 24h24v5H16zM11 30h34v6H11zM8 37h40v37H8zM12 75h32v6H12zM20 81h16v5H20z"
          fill="#57402b"
        />
        <path
          d="M13 35h30v39H13zM18 29h20v5H18zM14 76h28v3H14z"
          fill="#b4823f"
        />
        <path d="M17 39h22v31H17z" fill="#ffca68" />
        <path d="M21 42h14v25H21zM25 37h6v35h-6z" fill="#fff1b6" />
        <path
          d="M14 36h4v37h-4zM38 36h4v37h-4zM13 69h30v5H13z"
          fill="#92602e"
        />
        <path d="M12 34h29v3H12zM17 27h17v3H17z" fill="#e6bc72" />
      </svg>
    </div>
  );
}
