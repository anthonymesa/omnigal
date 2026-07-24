{
  description = "Omnigal - Packed multi-video viewer";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
  };

  outputs = { self, nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
    in {
      devShells.${system}.default = pkgs.mkShell {
        buildInputs = with pkgs; [
          nodejs_latest
          python3
        ];
        shellHook = ''
          PS1="''${PS1}(dev) "
        '';
      };
    };
}
