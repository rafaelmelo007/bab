class Ulm < Formula
  desc "Unified CLI gateway to Claude, Codex, Gemini, and Ollama"
  homepage "https://github.com/owner/ulm"
  url "https://registry.npmjs.org/ulm/-/ulm-VERSION.tgz"
  sha256 "SHA256_PLACEHOLDER"
  license any_of: ["MIT", "Apache-2.0"]

  depends_on "node"

  def install
    system "npm", "install", "-g",
           "--prefix=#{libexec}",
           "--ignore-scripts"
    bin.install_symlink Dir["#{libexec}/bin/*"]
    # Ensure ulm finds the correct Node.js from Homebrew
    (bin/"ulm").write_env_script libexec/"bin/ulm",
      PATH: "#{Formula["node"].opt_bin}:$PATH"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/ulm --version")
  end
end
