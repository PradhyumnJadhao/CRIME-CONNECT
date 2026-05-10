from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.pg_database import Base

class Case(Base):
    __tablename__ = "cases"

    id = Column(String, primary_key=True, index=True) # case_id like FIR-1042
    case_name = Column(String, index=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    members = relationship("CaseMember", back_populates="case")
    documents = relationship("Document", back_populates="case")

class CaseMember(Base):
    __tablename__ = "case_members"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    case_id = Column(String, ForeignKey("cases.id"))
    role = Column(String, default="investigator")

    case = relationship("Case", back_populates="members")
    # user = relationship("User")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String, ForeignKey("cases.id"))
    file_path = Column(String)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    case = relationship("Case", back_populates="documents")
