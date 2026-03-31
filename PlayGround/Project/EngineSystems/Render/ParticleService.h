#pragma once
#include "ParticleData.h"
#define _ParticleService ParticleService::Get()

/** ParticleService 클래스는 게임 내에서 파티클 시스템을 관리하는 싱글톤 서비스입니다. 이 클래스는 파티클의 생성, 업데이트, 렌더링을 담당하며, 게임 전체에서 하나의 인스턴스만 존재하도록 설계되었습니다. ParticleService는 IInitializable과 IUpdatable 인터페이스를 구현하여 초기화 및 매 프레임 업데이트 로직을 포함합니다. */
class ParticleService final
	: public ISingleton<ParticleService>
	, public IInitializable
	, public IUpdatable
{
public:
	_bool Initialize(_uint _pool_size);
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

	/** * @brief 설정값(Recipe)을 받아 파티클을 생성합니다.
	 * @param _setting 파티클의 모양, 색상, 물리 속성 등의 레시피
	 * @param _pos 생성될 중심 위치
	 * @param _count 한 번에 생성할 개수 (Burst 대응)
	 */
	void Emit(const ParticleSetting& _setting, const _Vector2& _pos, _uint _count = 1);

private:
	/**
	* 파티클 풀은 게임에서 사용되는 모든 파티클을 저장하는 컨테이너입니다.
	* 이 풀은 활성화된 파티클과 비활성화된 파티클을 모두 포함하며, 새로운 파티클이 필요할 때 비활성화된 파티클을 재사용하여 성능을 최적화합니다.
	*/
	std::vector<Particle> particle_pool_;

	/** 현재 활성화된 파티클의 인덱스들만 보관, Update와 Render는 이 리스트만 순회합니다. */
	std::list<_uint> active_indices_;

	/** 사용 가능한(비활성) 인덱스들을 보관 (스택처럼 사용) */
	std::vector<_uint> free_indices_;

	/** 현재 파티클 풀에서 활성화된 파티클의 수를 나타냅니다. 이 값은 업데이트 및 렌더링 시 활성화된 파티클만 처리하기 위해 사용됩니다. */
	_uint pool_size_ = 0;
};

