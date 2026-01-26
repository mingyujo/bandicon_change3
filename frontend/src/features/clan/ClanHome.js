import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiGet, apiPost, API_BASE_SERVER } from "../../api/api";
import MobileLayout from '../../components/MobileLayout';
import GlobalHeader from '../../components/GlobalHeader';
import BottomNav from '../../components/BottomNav';
import './ClanHome.css';

const ClanHome = ({ user }) => {
  const [clans, setClans] = useState([]);
  const [filteredClans, setFilteredClans] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const data = await apiGet("/clans/");
      setClans(data || []);
      setFilteredClans(data || []);
    } catch (e) {
      console.error("클랜 로드 에러:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Search Filter
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredClans(clans);
    } else {
      const lower = searchTerm.toLowerCase();
      const filtered = clans.filter(c =>
        c.name.toLowerCase().includes(lower) ||
        (c.description && c.description.toLowerCase().includes(lower))
      );
      setFilteredClans(filtered);
    }
  }, [searchTerm, clans]);

  const handleCreate = () => {
    navigate('/clans/create');
  };

  return (
    <MobileLayout>
      <GlobalHeader user={user} />

      <div className="clan-home-container">
        {/* Header */}
        <div className="clan-home-header">
          <h2 className="clan-page-title">클랜</h2>
          <button className="btn-create-clan" onClick={handleCreate}>
            클랜 생성
          </button>
        </div>

        {/* Search Bar */}
        <div className="clan-search-bar">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="클랜 명으로 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* List */}
        <div className="clan-list">
          {loading ? (
            <div className="clan-empty-state">로딩 중...</div>
          ) : filteredClans.length > 0 ? (
            filteredClans.map(clan => (
              <div key={clan.id} className="clan-home-card" onClick={() => navigate(`/clans/${clan.id}`)}>
                <img
                  className="clan-card-img"
                  src={clan.image
                    ? (clan.image.startsWith('http') ? clan.image : `${API_BASE_SERVER}${clan.image.startsWith('/') ? '' : '/'}${clan.image}`)
                    : "https://placehold.co/67x67"}
                  alt={clan.name}
                />
                <div className="clan-card-info">
                  <div className="clan-card-name">{clan.name}</div>
                  <div className="clan-card-desc">{clan.description || "설명 없음"}</div>
                  <div className="clan-card-members">멤버 : {clan.member_count || 0}명</div>
                  {clan.status === 'pending' && (
                    <div style={{
                      marginTop: '4px', padding: '2px 6px', fontSize: '11px',
                      background: '#fff3cd', color: '#856404', borderRadius: '4px',
                      display: 'inline-block', fontWeight: 'bold'
                    }}>
                      승인 대기
                    </div>
                  )}
                  {clan.status === 'rejected' && (
                    <div style={{
                      marginTop: '4px', padding: '2px 6px', fontSize: '11px',
                      background: '#f8d7da', color: '#721c24', borderRadius: '4px',
                      display: 'inline-block', fontWeight: 'bold'
                    }}>
                      거절됨
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="clan-empty-state">
              {searchTerm ? "검색 결과가 없습니다." : "클랜이 없습니다."}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </MobileLayout>
  );
};

export default ClanHome;