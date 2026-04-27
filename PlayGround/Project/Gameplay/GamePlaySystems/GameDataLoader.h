#pragma once

class GameDataLoader final
{
public:
	static _bool LoadAll();
	static _bool ReloadAll();

private:
	static _bool _LoadAllInternal(_bool _clear_particle_runtime);
};
